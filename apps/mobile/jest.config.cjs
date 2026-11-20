module.exports = {
	preset: 'jest-expo',
	testMatch: ['<rootDir>/src/**/*.test.[jt]s?(x)'],
	maxWorkers: 2,
	clearMocks: true,
	// Measure the native session boundary, eligibility rules and interactive forms.
	// Routes are also exercised through the browser/native acceptance flows.
	collectCoverageFrom: [
		'src/shared/api/client.ts',
		'src/shared/dates.ts',
		'src/features/auth/AuthProvider.tsx',
		'src/features/tickets/model.ts',
		'src/features/events/model.ts',
		'src/features/events/availability.ts',
		'src/features/checkout/policy.ts',
		'src/features/checkout/session-script.ts',
		'src/features/checkout/BrowserFrame.tsx',
		'src/features/auth/*Form.tsx',
		'src/features/account/NotificationForm.tsx',
		'src/features/tickets/PaymentSummary.tsx',
		'src/features/tickets/TicketAdmission.tsx',
	],
	coverageThreshold: { global: { statements: 91, branches: 80, functions: 92, lines: 92 } },
};
