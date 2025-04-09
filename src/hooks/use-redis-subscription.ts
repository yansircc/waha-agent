import { useEffect } from "react";

// Simple event system for Redis pub/sub
type Listener = (data: any) => void;
type Channel = string;

const listeners: Record<Channel, Set<Listener>> = {};

// Global event handlers for Redis PubSub
// Note: In a real app, you'd use a WebSocket or SSE for this
function subscribe(channel: string, callback: Listener) {
	if (!listeners[channel]) {
		listeners[channel] = new Set();

		// Register the channel subscription endpoint if this is the first listener
		fetch(`/api/subscribe?channel=${encodeURIComponent(channel)}`, {
			method: "GET",
		}).catch((err) => console.error("Error subscribing to channel:", err));
	}

	listeners[channel].add(callback);
}

function unsubscribe(channel: string, callback: Listener) {
	if (listeners[channel]) {
		listeners[channel].delete(callback);

		// If no more listeners, unsubscribe from the channel
		if (listeners[channel].size === 0) {
			delete listeners[channel];
			fetch(`/api/unsubscribe?channel=${encodeURIComponent(channel)}`, {
				method: "GET",
			}).catch((err) =>
				console.error("Error unsubscribing from channel:", err),
			);
		}
	}
}

// Event dispatch function that will be called by our API route
export function dispatchRedisEvent(channel: string, data: any) {
	if (listeners[channel]) {
		for (const callback of listeners[channel]) {
			try {
				callback(data);
			} catch (e) {
				console.error("Error in Redis event listener:", e);
			}
		}
	}
}

// React hook for Redis PubSub
export function useRedisSubscription(channel: string, callback: Listener) {
	useEffect(() => {
		subscribe(channel, callback);

		return () => {
			unsubscribe(channel, callback);
		};
	}, [channel, callback]);
}
