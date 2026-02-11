package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

// stripeClient wraps calls to the Stripe REST API using net/http
type stripeClient struct {
	secretKey  string
	httpClient *http.Client
}

func newStripeClient(secretKey string) *stripeClient {
	return &stripeClient{
		secretKey:  secretKey,
		httpClient: &http.Client{},
	}
}

// do performs a Stripe API request and decodes the JSON response
func (sc *stripeClient) do(method, path string, params url.Values) (map[string]any, error) {
	var body io.Reader
	if params != nil && (method == http.MethodPost || method == http.MethodDelete) {
		body = strings.NewReader(params.Encode())
	}

	fullURL := "https://api.stripe.com" + path
	if method == http.MethodGet && params != nil {
		fullURL += "?" + params.Encode()
	}

	req, err := http.NewRequest(method, fullURL, body)
	if err != nil {
		return nil, fmt.Errorf("stripe request build: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+sc.secretKey)
	if body != nil {
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	}

	resp, err := sc.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("stripe request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("stripe read body: %w", err)
	}

	var result map[string]any
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("stripe json decode: %w (status %d, body: %s)", err, resp.StatusCode, string(respBody))
	}

	if resp.StatusCode >= 400 {
		errMsg := string(respBody)
		if errObj, ok := result["error"].(map[string]any); ok {
			if msg, ok := errObj["message"].(string); ok {
				errMsg = msg
			}
		}
		return nil, fmt.Errorf("stripe %d: %s", resp.StatusCode, errMsg)
	}

	return result, nil
}

// createProduct creates a new product in Stripe with optional metadata
func (sc *stripeClient) createProduct(name, description string, metadata map[string]string) (string, error) {
	params := url.Values{
		"name": {name},
	}
	if description != "" {
		params.Set("description", description)
	}
	for k, v := range metadata {
		params.Set("metadata["+k+"]", v)
	}
	result, err := sc.do(http.MethodPost, "/v1/products", params)
	if err != nil {
		return "", err
	}
	id, _ := result["id"].(string)
	if id == "" {
		return "", fmt.Errorf("stripe product missing id")
	}
	return id, nil
}

// updateProductMetadata updates the metadata on an existing Stripe product
func (sc *stripeClient) updateProductMetadata(productID string, metadata map[string]string) error {
	params := url.Values{}
	for k, v := range metadata {
		params.Set("metadata["+k+"]", v)
	}
	_, err := sc.do(http.MethodPost, "/v1/products/"+productID, params)
	return err
}

// listProducts returns active Stripe products, optionally filtering by page.
func (sc *stripeClient) listProducts(limit int) ([]map[string]any, error) {
	params := url.Values{
		"active": {"true"},
		"limit":  {fmt.Sprintf("%d", limit)},
	}
	result, err := sc.do(http.MethodGet, "/v1/products", params)
	if err != nil {
		return nil, err
	}
	data, ok := result["data"].([]any)
	if !ok {
		return nil, nil
	}
	var products []map[string]any
	for _, item := range data {
		if p, ok := item.(map[string]any); ok {
			products = append(products, p)
		}
	}
	return products, nil
}

// findProductBySaasSlug searches existing Stripe products for one matching
// our saas_id and tier_slug metadata.
func (sc *stripeClient) findProductBySaasSlug(saasID, tierSlug string) (string, bool) {
	products, err := sc.listProducts(100)
	if err != nil {
		return "", false
	}
	for _, p := range products {
		meta, ok := p["metadata"].(map[string]any)
		if !ok {
			continue
		}
		if meta["saas_id"] == saasID && meta["tier_slug"] == tierSlug {
			if id, ok := p["id"].(string); ok && id != "" {
				return id, true
			}
		}
	}
	return "", false
}

// createPrice creates a new recurring price for a product
func (sc *stripeClient) createPrice(productID string, amountCents int, currency, interval string) (string, error) {
	params := url.Values{
		"product":             {productID},
		"unit_amount":         {fmt.Sprintf("%d", amountCents)},
		"currency":            {currency},
		"recurring[interval]": {interval},
	}
	result, err := sc.do(http.MethodPost, "/v1/prices", params)
	if err != nil {
		return "", err
	}
	id, _ := result["id"].(string)
	if id == "" {
		return "", fmt.Errorf("stripe price missing id")
	}
	return id, nil
}

// updateSubscription changes a subscription to a new price
func (sc *stripeClient) updateSubscription(subscriptionID, newPriceID string) error {
	// First get the subscription to find the item ID
	sub, err := sc.do(http.MethodGet, "/v1/subscriptions/"+subscriptionID, nil)
	if err != nil {
		return fmt.Errorf("get subscription: %w", err)
	}

	items, ok := sub["items"].(map[string]any)
	if !ok {
		return fmt.Errorf("subscription has no items")
	}
	data, ok := items["data"].([]any)
	if !ok || len(data) == 0 {
		return fmt.Errorf("subscription has no item data")
	}
	firstItem, ok := data[0].(map[string]any)
	if !ok {
		return fmt.Errorf("invalid subscription item")
	}
	itemID, _ := firstItem["id"].(string)
	if itemID == "" {
		return fmt.Errorf("subscription item missing id")
	}

	params := url.Values{
		"items[0][id]":       {itemID},
		"items[0][price]":    {newPriceID},
		"proration_behavior": {"create_prorations"},
	}
	_, err = sc.do(http.MethodPost, "/v1/subscriptions/"+subscriptionID, params)
	return err
}

// cancelSubscription cancels a stripe subscription at period end
func (sc *stripeClient) cancelSubscription(subscriptionID string) error {
	params := url.Values{
		"cancel_at_period_end": {"true"},
	}
	_, err := sc.do(http.MethodPost, "/v1/subscriptions/"+subscriptionID, params)
	return err
}

// createCheckoutSession creates a Stripe Checkout session for a price
func (sc *stripeClient) createCheckoutSession(priceID, customerEmail, successURL, cancelURL string) (string, error) {
	params := url.Values{
		"mode":                    {"subscription"},
		"line_items[0][price]":    {priceID},
		"line_items[0][quantity]": {"1"},
		"success_url":             {successURL},
		"cancel_url":              {cancelURL},
	}
	if customerEmail != "" {
		params.Set("customer_email", customerEmail)
	}
	result, err := sc.do(http.MethodPost, "/v1/checkout/sessions", params)
	if err != nil {
		return "", err
	}
	sessionURL, _ := result["url"].(string)
	if sessionURL == "" {
		return "", fmt.Errorf("checkout session missing url")
	}
	return sessionURL, nil
}
