package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

const PORT = ":8080"

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
		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/octet-stream")
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("Connection", "keep-alive")

		w.WriteHeader(http.StatusOK)

		chunk := make([]byte, 64*1024)

		for {
			select {
			case <-r.Context().Done():
				return
			default:
			}

			_, err := w.Write(chunk)
			if err != nil {
				return
			}

			flusher.Flush()
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
