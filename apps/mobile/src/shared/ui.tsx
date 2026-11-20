import type { ReactNode } from 'react';
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
	type TextInputProps,
	type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { colors as c, fonts } from './theme';

export function Label({ children, muted = false, style }: { children: ReactNode; muted?: boolean; style?: object }) {
	return <Text style={[s.text, muted && { color: c.muted }, style]}>{children}</Text>;
}
export function Heading({ children, small = false }: { children: ReactNode; small?: boolean }) {
	return (
		<Text accessibilityRole="header" style={[s.heading, small && { fontSize: 21, lineHeight: 28 }]}>
			{children}
		</Text>
	);
}
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
	return <View style={[s.card, style]}>{children}</View>;
}
export function Button({
	label,
	onPress,
	loading = false,
	secondary = false,
	disabled = false,
	icon,
}: {
	label: string;
	onPress: () => void;
	loading?: boolean;
	secondary?: boolean;
	disabled?: boolean;
	icon?: React.ComponentProps<typeof Feather>['name'];
}) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{ disabled: disabled || loading, busy: loading }}
			disabled={disabled || loading}
			onPress={onPress}
			style={({ pressed }) => [
				s.button,
				secondary && s.secondary,
				(pressed || disabled || loading) && { opacity: 0.65 },
			]}
		>
			{loading ? (
				<ActivityIndicator color={secondary ? c.violet : c.white} />
			) : icon ? (
				<Feather name={icon} color={secondary ? c.violet : c.white} size={18} />
			) : null}
			<Text style={[s.buttonText, secondary && { color: c.violet }]}>{label}</Text>
		</Pressable>
	);
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
	return (
		<View style={{ gap: 8 }}>
			<Label style={{ fontFamily: fonts.bold, fontSize: 13 }}>{label}</Label>
			<TextInput accessibilityLabel={label} placeholderTextColor="#9C91AC" style={s.input} {...props} />
		</View>
	);
}
export function Notice({ message }: { message?: string | null }) {
	return message ? (
		<View accessibilityRole="alert" style={s.notice}>
			<Feather name="info" size={18} color={c.violet} />
			<Label style={{ flex: 1 }}>{message}</Label>
		</View>
	) : null;
}
export function Empty({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
	return (
		<View style={s.empty}>
			<View style={s.emptyIcon}>
				<Feather name="compass" size={30} color={c.violet} />
			</View>
			<Heading small>{title}</Heading>
			<Label muted style={{ textAlign: 'center' }}>
				{message}
			</Label>
			{action}
		</View>
	);
}
export function Loading() {
	return (
		<View accessibilityRole="progressbar" accessibilityLabel="Carregando" style={{ padding: 40 }}>
			<ActivityIndicator size="large" color={c.violet} />
		</View>
	);
}
export function Header({ title, back = false, action }: { title?: string; back?: boolean; action?: ReactNode }) {
	return (
		<View style={s.header}>
			{back ? (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel="Voltar"
					onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
					style={s.iconButton}
				>
					<Feather name="arrow-left" size={22} color={c.plum} />
				</Pressable>
			) : (
				<Image
					source={require('../../assets/logo.png')}
					contentFit="contain"
					accessibilityLabel="Flouvi"
					style={{ width: 114, height: 38 }}
				/>
			)}
			{title ? (
				<Text style={[s.text, { fontFamily: fonts.bold, flex: 1 }]} numberOfLines={1}>
					{title}
				</Text>
			) : (
				<View style={{ flex: 1 }} />
			)}
			{action}
		</View>
	);
}
export function Screen({
	children,
	title,
	back = false,
	scroll = true,
	action,
}: {
	children: ReactNode;
	title?: string;
	back?: boolean;
	scroll?: boolean;
	action?: ReactNode;
}) {
	return (
		<SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
			<Header title={title} back={back} action={action} />
			{scroll ? (
				<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
					{children}
				</ScrollView>
			) : (
				<View style={{ flex: 1 }}>{children}</View>
			)}
		</SafeAreaView>
	);
}
export function Badge({ label, tone = 'violet' }: { label: string; tone?: 'violet' | 'success' | 'warning' }) {
	const bg = tone === 'success' ? c.successBg : tone === 'warning' ? c.warningBg : c.mist;
	const fg = tone === 'success' ? c.success : tone === 'warning' ? c.warning : c.violet;
	return (
		<View
			style={{
				backgroundColor: bg,
				borderRadius: 20,
				paddingHorizontal: 10,
				paddingVertical: 6,
				alignSelf: 'flex-start',
			}}
		>
			<Text style={{ fontFamily: fonts.bold, color: fg, fontSize: 11 }}>{label}</Text>
		</View>
	);
}
export const s = StyleSheet.create({
	safe: { flex: 1, backgroundColor: c.canvas },
	content: { padding: 22, paddingBottom: 44, gap: 22, width: '100%', maxWidth: 720, alignSelf: 'center' },
	header: {
		height: 72,
		paddingHorizontal: 22,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		backgroundColor: c.white,
		borderBottomWidth: 1,
		borderBottomColor: c.line,
	},
	text: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: c.plum },
	heading: { fontFamily: fonts.bold, fontSize: 31, lineHeight: 38, letterSpacing: -0.8, color: c.plum },
	card: { padding: 20, backgroundColor: c.white, borderWidth: 1, borderColor: c.line, borderRadius: 22, gap: 14 },
	button: {
		minHeight: 52,
		paddingHorizontal: 20,
		paddingVertical: 14,
		borderRadius: 16,
		backgroundColor: c.violet,
		flexDirection: 'row',
		gap: 10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	secondary: { backgroundColor: c.mist },
	buttonText: { fontFamily: fonts.bold, fontSize: 15, color: c.white },
	input: {
		fontFamily: fonts.body,
		color: c.plum,
		backgroundColor: c.white,
		borderWidth: 1,
		borderColor: c.line,
		borderRadius: 14,
		paddingHorizontal: 16,
		paddingVertical: 14,
		minHeight: 52,
		fontSize: 16,
	},
	notice: { backgroundColor: c.mist, borderRadius: 14, padding: 16, flexDirection: 'row', gap: 10 },
	empty: { alignItems: 'center', gap: 16, paddingVertical: 36, paddingHorizontal: 20 },
	emptyIcon: {
		height: 74,
		width: 74,
		borderRadius: 26,
		backgroundColor: c.mist,
		alignItems: 'center',
		justifyContent: 'center',
	},
	iconButton: {
		height: 44,
		width: 44,
		borderRadius: 16,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: c.mist,
	},
	row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
	between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
	section: { gap: 14 },
});
