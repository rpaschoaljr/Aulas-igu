package duration

import (
	"testing"
)

func TestParseISO8601Duration(t *testing.T) {
	tests := []struct {
		input    string
		expected int
	}{
		{"PT3M30S", 210},
		{"PT1H", 3600},
		{"PT45S", 45},
		{"P1DT2H3M4S", 86400 + 7200 + 180 + 4},
		{"", 0},
		{"invalid", 0},
	}

	for _, tt := range tests {
		got := ParseISO8601Duration(tt.input)
		if got != tt.expected {
			t.Errorf("ParseISO8601Duration(%q) = %d, esperava %d", tt.input, got, tt.expected)
		}
	}
}
