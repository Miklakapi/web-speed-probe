package main

import (
	"context"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"
)

const PORT = ":8080"
const DEFAULT_DOWNLOAD_SIZE = 50_000_000

type zeroReader struct{}

func (zeroReader) Read(buffer []byte) (int, error) {
	for i := range buffer {
		buffer[i] = 0
	}

	return len(buffer), nil
}

func main() {
	appCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	staticDir := http.Dir("./web")
	fileServer := http.FileServer(staticDir)

	mux := http.NewServeMux()
	mux.Handle("/", fileServer)
	mux.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})
	mux.HandleFunc("/download", func(w http.ResponseWriter, r *http.Request) {
		size := int64(DEFAULT_DOWNLOAD_SIZE)
		sizeParam := r.URL.Query().Get("size")

		if sizeParam != "" {
			parsedSize, err := strconv.ParseInt(sizeParam, 10, 64)
			if err != nil {
				http.Error(w, "Invalid size parameter", http.StatusBadRequest)
				return
			}

			if parsedSize <= 0 {
				http.Error(w, "Size must be greater than zero", http.StatusBadRequest)
				return
			}

			size = parsedSize
		}

		w.Header().Set("Content-Type", "application/octet-stream")
		w.Header().Set("Content-Length", strconv.FormatInt(size, 10))
		w.Header().Set("Cache-Control", "no-store")
		w.WriteHeader(http.StatusOK)

		_, err := io.CopyN(w, zeroReader{}, size)
		if err != nil {
			log.Println(err)
		}
	})

	srv := &http.Server{
		Addr:         PORT,
		Handler:      mux,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Println("HTTP server started on " + PORT)

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen error: %v", err)
		}
	}()

	<-appCtx.Done()
	log.Println("shutdown signal received")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("graceful shutdown failed: %v, forcing close", err)

		if err := srv.Close(); err != nil {
			log.Printf("forced server close failed: %v", err)
		}
	}

	log.Println("server stopped gracefully")
}
