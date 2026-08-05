export interface ProblemDetails {
	type: string;
	title: string;
	status: number;
	detail?: string;
	instance?: string;
	requestId?: string;
	context?: Record<string, unknown>;
}
