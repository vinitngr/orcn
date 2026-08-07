package logger

import (
	"fmt"
	"os"
	"time"

	"github.com/fatih/color"
)

type LogLevel int

const (
	LevelDebug LogLevel = iota
	LevelInfo
	LevelWarn
	LevelError
	LevelFatal
	LevelNone // turns off logging completely
)

var GlobalLogLevel = LevelInfo

type Logger struct {
	module string
}

func New(module string) *Logger {
	return &Logger{module: module}
}

func SetLevel(level LogLevel) {
	GlobalLogLevel = level
}

func (l *Logger) print(level LogLevel, levelStr string, colorFunc func(a ...interface{}) string, format string, args ...interface{}) {
	if level < GlobalLogLevel || GlobalLogLevel == LevelNone {
		return
	}

	timestamp := time.Now().Format("2006-01-02 15:04:05")
	msg := fmt.Sprintf(format, args...)
	
	// Format: [date] [ERROR] (name) Message
	prefix := fmt.Sprintf("[%s] %s (%s)", timestamp, colorFunc("["+levelStr+"]"), color.New(color.Bold, color.FgHiWhite).Sprint(l.module))
	fmt.Printf("%s %s\n", prefix, msg)

	if level == LevelFatal {
		os.Exit(1)
	}
}

func (l *Logger) Debug(format string, args ...interface{}) {
	l.print(LevelDebug, "DEBUG", color.New(color.FgCyan).SprintFunc(), format, args...)
}

func (l *Logger) Info(format string, args ...interface{}) {
	l.print(LevelInfo, "INFO", color.New(color.FgGreen).SprintFunc(), format, args...)
}

func (l *Logger) Warn(format string, args ...interface{}) {
	l.print(LevelWarn, "WARN", color.New(color.FgYellow).SprintFunc(), format, args...)
}

func (l *Logger) Error(format string, args ...interface{}) {
	l.print(LevelError, "ERROR", color.New(color.FgRed, color.Bold).SprintFunc(), format, args...)
}

func (l *Logger) Fatal(format string, args ...interface{}) {
	l.print(LevelFatal, "FATAL", color.New(color.BgRed, color.FgHiWhite, color.Bold).SprintFunc(), format, args...)
}
