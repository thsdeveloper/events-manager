import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';
import typography from '@tailwindcss/typography';

const config: Config = {
	darkMode: ['class'],
	content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}', './src/**/*.{js,ts,jsx,tsx}'],
	theme: {
    	extend: {
    		fontFamily: {
    			heading: [
    				'Poppins',
    				'sans-serif'
    			],
    			sans: [
    				'Inter',
    				'sans-serif'
    			],
    			code: [
    				'Fira Mono',
    				'monospace'
    			]
    		},
    		fontSize: {
    			tagline: [
    				'24px',
    				'33.6px'
    			],
    			headline: [
    				'56px',
    				'64px'
    			],
    			h1: [
    				'56px',
    				'78.4px'
    			],
    			h2: [
    				'36px',
    				'50.4px'
    			],
    			h3: [
    				'24px',
    				'33.6px'
    			],
    			description: [
    				'16px',
    				'22.4px'
    			],
    			regular: [
    				'16px',
    				'24px'
    			],
    			bold: [
    				'16px',
    				'22.4px'
    			],
    			nav: [
    				'16px',
    				'22.4px'
    			],
    			code: [
    				'14px',
    				'16.8px'
    			]
    		},
    		alignments: {
    			left: 'text-left',
    			center: 'text-center',
    			right: 'text-right'
    		},
    		colors: {
    			background: 'hsl(var(--background))',
    			foreground: 'hsl(var(--foreground))',
    			primary: {
    				DEFAULT: 'hsl(var(--primary))',
    				foreground: 'hsl(var(--primary-foreground))'
    			},
    			input: 'hsl(var(--input))',
    			secondary: {
    				DEFAULT: 'hsl(var(--secondary))',
    				foreground: 'hsl(var(--secondary-foreground))'
    			},
    			accent: {
    				DEFAULT: 'hsl(var(--accent))',
    				foreground: 'hsl(var(--accent-foreground))'
    			},
    			soft: 'var(--accent-color-soft)',
    			blue: {
    				DEFAULT: '#172940'
    			},
    			gray: {
    				DEFAULT: '#F5F8FB',
    				muted: '#A5B0BD',
    				dark: '#42566E'
    			},
    			card: {
    				DEFAULT: 'hsl(var(--card))',
    				foreground: 'hsl(var(--card-foreground))'
    			},
    			popover: {
    				DEFAULT: 'hsl(var(--popover))',
    				foreground: 'hsl(var(--popover-foreground))'
    			},
    			muted: {
    				DEFAULT: 'hsl(var(--muted))',
    				foreground: 'hsl(var(--muted-foreground))'
    			},
    			destructive: {
    				DEFAULT: 'hsl(var(--destructive))',
    				foreground: 'hsl(var(--destructive-foreground))'
    			},
    			border: 'hsl(var(--border))',
    			ring: 'hsl(var(--ring))',
    			chart: {
    				'1': 'hsl(var(--chart-1))',
    				'2': 'hsl(var(--chart-2))',
    				'3': 'hsl(var(--chart-3))',
    				'4': 'hsl(var(--chart-4))',
    				'5': 'hsl(var(--chart-5))'
    			}
    		},
    		typography: {
    			DEFAULT: {
    				css: {
    					color: 'var(--foreground-color)',
    					textAlign: 'left',
    					a: {
    						color: 'var(--accent-color)',
    						textDecoration: 'none',
    						'&:hover': {
    							textDecoration: 'underline'
    						}
    					},
    					h1: {
    						fontFamily: 'Poppins',
    						fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
    						fontWeight: '400',
    						lineHeight: '1.2',
    						marginTop: '1rem'
    					},
    					h2: {
    						fontFamily: 'Poppins',
    						fontSize: 'clamp(2rem, 4vw, 2.5rem)',
    						fontWeight: '400',
    						lineHeight: '1.3',
    						marginTop: '1rem'
    					},
    					h3: {
    						fontFamily: 'Poppins',
    						fontSize: 'clamp(1.5rem, 3vw, 2rem)',
    						fontWeight: '400',
    						lineHeight: '1.4',
    						marginTop: '0'
    					},
    					p: {
    						fontFamily: 'Inter',
    						fontSize: 'clamp(1rem, 2vw, 1.25rem)',
    						fontWeight: '400',
    						lineHeight: '1.75'
    					},
    					img: {
    						borderRadius: '8px',
    						margin: '1rem 0',
    						maxWidth: '100%',
    						height: 'auto'
    					},
    					iframe: {
    						borderRadius: '8px',
    						margin: '1rem 0'
    					},
    					code: {
    						fontFamily: 'Fira Mono',
    						fontSize: 'clamp(0.875rem, 1rem, 1.125rem)',
    						fontWeight: '400',
    						lineHeight: '1.6',
    						backgroundColor: 'var(--background-color-muted)',
    						color: 'var(--foreground-color)',
    						borderRadius: '4px',
    						padding: '0.15rem 0.35rem',
    						display: 'inline',
    						'&::before': {
    							content: 'none'
    						},
    						'&::after': {
    							content: 'none'
    						}
    					},
    					'p > code': {
    						'&::before': {
    							content: 'none'
    						},
    						'&::after': {
    							content: 'none'
    						}
    					},
    					pre: {
    						fontFamily: 'Fira Mono',
    						fontSize: 'clamp(0.9rem, 1.125rem, 1.25rem)',
    						lineHeight: '1.6',
    						backgroundColor: 'var(--background-color-muted)',
    						color: 'var(--foreground-color)',
    						borderRadius: '8px',
    						padding: '1rem',
    						overflowX: 'auto'
    					},
    					blockquote: {
    						fontStyle: 'italic',
    						borderLeft: '4px solid var(--accent-color)',
    						paddingLeft: '1rem',
    						textAlign: 'left'
    					},
    					ul: {
    						listStyleType: 'disc',
    						paddingLeft: '1.25rem',
    						listStylePosition: 'inside'
    					},
    					ol: {
    						listStyleType: 'decimal',
    						paddingLeft: '1.25rem',
    						listStylePosition: 'inside'
    					},
    					li: {
    						marginBottom: '0.5rem',
    						'& p': {
    							display: 'inline',
    							margin: '0'
    						}
    					}
    				}
    			},
    			dark: {
    				css: {
    					color: 'var(--foreground-color)',
    					a: {
    						color: 'var(--accent-color)',
    						textDecoration: 'none',
    						'&:hover': {
    							textDecoration: 'underline'
    						}
    					},
    					blockquote: {
    						borderLeftColor: 'var(--gray-700)'
    					}
    				}
    			}
    		},
    		borderRadius: {
    			lg: 'var(--radius)',
    			md: 'calc(var(--radius) - 2px)',
    			sm: 'calc(var(--radius) - 4px)'
    		},
    		animation: {
    			'spin-slow': 'spin 3s linear infinite',
    		},
    		keyframes: {
    			'spin': {
    				'0%': { transform: 'rotate(0deg)' },
    				'100%': { transform: 'rotate(360deg)' },
    			}
    		}
    	}
    },
	plugins: [tailwindcssAnimate, typography],
	safelist: ['grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3'],
};

export default config;
