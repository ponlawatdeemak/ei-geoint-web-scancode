import NextAuth from 'next-auth'

interface UserSession {
	sub: string
	id: string
	roleId: number
	iat: number
	exp: number
	jti: string
	accessToken: string
	refreshToken: string
}

declare module 'next-auth' {
	interface Session {
		user: UserSession
		error?: string
	}
}

declare module 'next-auth/jwt' {
	/** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
	interface JWT extends UserSession {
		error?: string
	}
}
