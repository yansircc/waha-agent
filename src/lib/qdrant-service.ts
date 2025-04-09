import { QdrantClient } from "@qdrant/qdrant-js";
import { env } from "../env";

interface VectorPayload {
	[key: string]: unknown;
}

interface PointData {
	id: string | number;
	vector: number[];
	payload?: VectorPayload;
}

interface CollectionConfig {
	vectors: {
		size: number;
		distance: "Cosine" | "Euclid" | "Dot";
	};
	optimizers_config?: {
		default_segment_number?: number;
	};
	replication_factor?: number;
}

interface SearchOptions {
	vector: number[];
	limit?: number;
	filter?: Record<string, unknown>;
}

interface PayloadIndexOptions {
	field_name: string;
	field_schema: "keyword" | "integer" | "float" | "geo" | "text";
	wait?: boolean;
}

export class QdrantService {
	private client: QdrantClient;

	constructor() {
		this.client = new QdrantClient({
			url: env.QDRANT_URL,
			apiKey: env.QDRANT_API_KEY,
		});
	}

	// Collection operations
	async listCollections() {
		const response = await this.client.getCollections();
		return response.collections;
	}

	async collectionExists(collectionName: string): Promise<boolean> {
		try {
			const response = await this.client.collectionExists(collectionName);
			return response.exists;
		} catch (error) {
			console.error(
				`Error checking collection existence ${collectionName}:`,
				error,
			);
			return false;
		}
	}

	async getCollection(collectionName: string) {
		try {
			return await this.client.getCollection(collectionName);
		} catch (error) {
			console.error(`Error getting collection ${collectionName}:`, error);
			throw error;
		}
	}

	async createCollection(collectionName: string, config: CollectionConfig) {
		try {
			return await this.client.createCollection(collectionName, config);
		} catch (error) {
			console.error(`Error creating collection ${collectionName}:`, error);
			throw error;
		}
	}

	async deleteCollection(collectionName: string) {
		try {
			return await this.client.deleteCollection(collectionName);
		} catch (error) {
			console.error(`Error deleting collection ${collectionName}:`, error);
			throw error;
		}
	}

	// Payload index operations
	async createPayloadIndex(
		collectionName: string,
		options: PayloadIndexOptions,
	) {
		try {
			return await this.client.createPayloadIndex(collectionName, options);
		} catch (error) {
			console.error(
				`Error creating payload index in ${collectionName}:`,
				error,
			);
			throw error;
		}
	}

	// Point operations
	async upsertPoints(collectionName: string, points: PointData[], wait = true) {
		try {
			return await this.client.upsert(collectionName, {
				wait,
				points,
			});
		} catch (error) {
			console.error(`Error upserting points to ${collectionName}:`, error);
			throw error;
		}
	}

	async deletePoints(
		collectionName: string,
		pointIds: (string | number)[],
		wait = true,
	) {
		try {
			return await this.client.delete(collectionName, {
				wait,
				points: pointIds,
			});
		} catch (error) {
			console.error(`Error deleting points from ${collectionName}:`, error);
			throw error;
		}
	}

	async retrievePoints(collectionName: string, pointIds: (string | number)[]) {
		try {
			return await this.client.retrieve(collectionName, {
				ids: pointIds,
			});
		} catch (error) {
			console.error(`Error retrieving points from ${collectionName}:`, error);
			throw error;
		}
	}

	// Search operations
	async search(collectionName: string, options: SearchOptions) {
		try {
			return await this.client.search(collectionName, options);
		} catch (error) {
			console.error(`Error searching in ${collectionName}:`, error);
			throw error;
		}
	}

	async searchWithFilter(
		collectionName: string,
		vector: number[],
		filter: Record<string, unknown>,
		limit = 10,
	) {
		try {
			return await this.client.search(collectionName, {
				vector,
				filter,
				limit,
			});
		} catch (error) {
			console.error(`Error searching with filter in ${collectionName}:`, error);
			throw error;
		}
	}

	async searchBatch(
		collectionName: string,
		searches: {
			vector: number[];
			limit: number;
			filter?: Record<string, unknown>;
		}[],
	) {
		try {
			return await this.client.searchBatch(collectionName, {
				searches,
			});
		} catch (error) {
			console.error(`Error batch searching in ${collectionName}:`, error);
			throw error;
		}
	}
}

export const qdrantService = new QdrantService();
