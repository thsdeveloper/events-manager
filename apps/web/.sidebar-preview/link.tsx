import { forwardRef } from 'react';
export default forwardRef(function Link({ href, children, onClick, prefetch, ...props }: any, ref: any) {
	return (
		<a
			ref={ref}
			href={href}
			{...props}
			onClick={(e) => {
				e.preventDefault();
				onClick?.(e);
			}}
		>
			{children}
		</a>
	);
});
