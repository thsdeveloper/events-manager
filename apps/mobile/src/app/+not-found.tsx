import { router } from 'expo-router';
import { Button, Empty, Screen } from '../shared/ui';
export default function NotFound() {
	return (
		<Screen>
			<Empty
				title="Esse caminho mudou"
				message="Volte para descobrir os próximos eventos."
				action={<Button label="Explorar eventos" onPress={() => router.replace('/')} />}
			/>
		</Screen>
	);
}
