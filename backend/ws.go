package main

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"nhooyr.io/websocket"
)

// WSHub manages WebSocket connections and broadcasting
type WSHub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.Mutex
}

// Client represents a connected WebSocket client
type Client struct {
	hub  *WSHub
	conn *websocket.Conn
	send chan []byte
}

// NewWSHub creates a new WebSocket hub
func NewWSHub() *WSHub {
	return &WSHub{
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
	}
}

// Run starts the hub's main loop
func (h *WSHub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			if appLog != nil {
				appLog.Debug("WS: Client connected (total: %d)", len(h.clients))
			}

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			if appLog != nil {
				appLog.Debug("WS: Client disconnected (total: %d)", len(h.clients))
			}

		case message := <-h.broadcast:
			h.mu.Lock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.Unlock()
		}
	}
}

// handleWebsocket handles WebSocket requests from the peer.
func (h *WSHub) handleWebsocket(w http.ResponseWriter, r *http.Request) {
	c, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		OriginPatterns: []string{"*"}, // Allow all origins for now (or strict: "localhost:5173", "*.portnumber53.com")
	})
	if err != nil {
		if appLog != nil {
			appLog.Error("WS: Failed to accept connection: %v", err)
		}
		return
	}

	client := &Client{hub: h, conn: c, send: make(chan []byte, 256)}
	h.register <- client

	// Start pump goroutines
	go client.writePump(r.Context())
	go client.readPump(r.Context())
}

// readPump pumps messages from the websocket connection to the hub.
// (We mainly use this to detect disconnects since we only push data currently)
func (c *Client) readPump(ctx context.Context) {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close(websocket.StatusNormalClosure, "")
	}()

	for {
		_, _, err := c.conn.Read(ctx)
		if err != nil {
			// standard closure or error
			break
		}
	}
}

// writePump pumps messages from the hub to the websocket connection.
func (c *Client) writePump(ctx context.Context) {
	defer func() {
		c.conn.Close(websocket.StatusInternalError, "internal error")
	}()

	for {
		select {
		case message, ok := <-c.send:
			if !ok {
				// Hub closed the channel.
				c.conn.Close(websocket.StatusNormalClosure, "hub closed")
				return
			}

			w, err := c.conn.Writer(ctx, websocket.MessageText)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages to the current websocket message.
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ctx.Done():
			return
		}
	}
}

// BroadcastMessage sends a JSON message to all connected clients
func (h *WSHub) BroadcastMessage(msgType string, payload any) {
	msg := map[string]any{
		"type":    msgType,
		"payload": payload,
		"ts":      time.Now().UnixMilli(),
	}
	jsonBytes, err := json.Marshal(msg)
	if err != nil {
		if appLog != nil {
			appLog.Error("WS: Failed to marshal broadcast message: %v", err)
		}
		return
	}
	h.broadcast <- jsonBytes
}
