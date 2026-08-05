'use client';

import { useMemo } from 'react';

interface FormData {
	[key: string]: any;
}

interface FieldConfig {
	name: string;
	label: string;
	required: boolean;
	weight?: number; // Optional weight for calculating importance
}

interface SectionConfig {
	name: string;
	label: string;
	fields: FieldConfig[];
}

export function useFormProgress(data: FormData, sections: SectionConfig[]) {
	const progress = useMemo(() => {
		let totalWeight = 0;
		let completedWeight = 0;

		const sectionProgress = sections.map(section => {
			let sectionTotalWeight = 0;
			let sectionCompletedWeight = 0;

			section.fields.forEach(field => {
				const weight = field.weight || 1;
				sectionTotalWeight += weight;
				totalWeight += weight;

				const value = data[field.name];
				const isCompleted = value !== null && value !== undefined && value !== '';

				if (isCompleted) {
					sectionCompletedWeight += weight;
					completedWeight += weight;
				}
			});

			return {
				label: section.label,
				completed: sectionCompletedWeight === sectionTotalWeight,
				progress: sectionTotalWeight > 0
					? (sectionCompletedWeight / sectionTotalWeight) * 100
					: 0,
			};
		});

		const overallProgress = totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0;

		return {
			overall: overallProgress,
			sections: sectionProgress,
		};
	}, [data, sections]);

	return progress;
}
