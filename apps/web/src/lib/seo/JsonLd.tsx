import { type JsonLdObject, serializeJsonLd } from './json-ld';

interface JsonLdProps {
	data: JsonLdObject | JsonLdObject[];
}

/** Dados estruturados (schema.org) da página, um `<script>` por objeto. */
export default function JsonLd({ data }: JsonLdProps) {
	const objects = Array.isArray(data) ? data : [data];

	return (
		<>
			{objects.map((object, index) => (
				<script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(object) }} />
			))}
		</>
	);
}
