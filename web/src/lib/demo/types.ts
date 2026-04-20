export interface Sensor {
	id: string;
	label: string;
	color: string;
	active: boolean;
}

export interface Detection {
	id: string;
	label: string;
	confidence: number;
	color: string;
	visible: boolean;
}

export interface Stat {
	label: string;
	value: string;
}
