package main

import (
	"fmt"
	"log"
	"os"
	"strings"
)

// LogLevel represents a logging severity level
type LogLevel int

const (
	LevelDebug LogLevel = iota
	LevelInfo
	LevelWarn
	LevelError
)

var levelNames = map[LogLevel]string{
	LevelDebug: "DEBUG",
	LevelInfo:  "INFO",
	LevelWarn:  "WARN",
	LevelError: "ERROR",
}

// Logger wraps the standard library logger with level filtering
type Logger struct {
	level  LogLevel
	logger *log.Logger
}

// NewLogger creates a Logger at the given level
func NewLogger(level LogLevel) *Logger {
	return &Logger{
		level:  level,
		logger: log.New(os.Stderr, "", log.LstdFlags),
	}
}

// NewLoggerFromEnv creates a Logger reading LOG_LEVEL from environment
func NewLoggerFromEnv() *Logger {
	s := strings.ToUpper(strings.TrimSpace(os.Getenv("LOG_LEVEL")))
	level := LevelInfo // default
	switch s {
	case "DEBUG":
		level = LevelDebug
	case "INFO":
		level = LevelInfo
	case "WARN", "WARNING":
		level = LevelWarn
	case "ERROR":
		level = LevelError
	}
	return NewLogger(level)
}

func (l *Logger) log(lvl LogLevel, format string, args ...any) {
	if lvl < l.level {
		return
	}
	prefix := levelNames[lvl]
	msg := fmt.Sprintf(format, args...)
	l.logger.Printf("[%s] %s", prefix, msg)
}

func (l *Logger) Debug(format string, args ...any) { l.log(LevelDebug, format, args...) }
func (l *Logger) Info(format string, args ...any)  { l.log(LevelInfo, format, args...) }
func (l *Logger) Warn(format string, args ...any)  { l.log(LevelWarn, format, args...) }
func (l *Logger) Error(format string, args ...any) { l.log(LevelError, format, args...) }

// Fatal logs at ERROR level and exits
func (l *Logger) Fatal(format string, args ...any) {
	l.log(LevelError, format, args...)
	os.Exit(1)
}
