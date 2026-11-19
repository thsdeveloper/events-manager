export function usePathname() {
	return new URLSearchParams(location.search).get('path') || '/admin/eventos';
}
export function useRouter() {
	return { push() {}, replace() {}, refresh() {} };
}
export function useSearchParams() {
	return new URLSearchParams(location.search);
}
