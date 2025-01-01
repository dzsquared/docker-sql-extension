package main

import (
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"

	"github.com/labstack/echo"
)

func TestConnectionString(t *testing.T) {
	tests := []struct {
		name      string
		container ContainerInfo
		isMaster  bool
		want      string
	}{
		{
			name: "Master Database",
			container: ContainerInfo{
				SApassword:   "password123",
				Port:         "1433",
				Databasename: "testdb",
			},
			isMaster: true,
			want:     "server=host.docker.internal,1433;user id=sa;password=password123;database=master;trust server certificate=true",
		},
		{
			name: "Specific Database",
			container: ContainerInfo{
				SApassword:   "password123",
				Port:         "1433",
				Databasename: "testdb",
			},
			isMaster: false,
			want:     "server=host.docker.internal,1433;user id=sa;password=password123;database=testdb;trust server certificate=true",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.container.connectionString(tt.isMaster); got != tt.want {
				t.Errorf("connectionString() = %v, want %v", got, tt.want)
			}
		})
	}
}

// { SApassword: container.SApassword, Port: String(container.Port1433), Databasename: "master" }
// test to validate echo.Context Bind(&containerInfo) returns the correct ContainerInfo struct
// simulating an incoming post request with a JSON body
func TestContainerInfoStruct(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected ContainerInfo
	}{
		{
			name:  "Master Database",
			input: `{"saPassword":"password123","port":"1433","databaseName":"master"}`,
			expected: ContainerInfo{
				SApassword:   "password123",
				Port:         "1433",
				Databasename: "master",
			},
		},
		{
			name:  "Specific Database",
			input: `{"saPassword":"password123","port":"1433","databaseName":"testdb"}`,
			expected: ContainerInfo{
				SApassword:   "password123",
				Port:         "1433",
				Databasename: "testdb",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			e := echo.New()
			req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(tt.input))
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)

			var got ContainerInfo
			if err := c.Bind(&got); err != nil {
				t.Fatalf("Bind() error = %v", err)
			}

			if !reflect.DeepEqual(got, tt.expected) {
				t.Errorf("Bind() = %v, want %v", got, tt.expected)
			}
		})
	}
}
