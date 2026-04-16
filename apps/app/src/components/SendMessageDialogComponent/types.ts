export interface Exchange {
  name: string;
  type: string;
  bindings?: unknown[];
}

export interface Queue {
  name: string;
}

export interface RoutingError {
  message: string;
  suggestions: string[];
  details?: {
    reason: string;
    exchange: string;
    routingKey: string;
    possibleCauses: string[];
  };
}
