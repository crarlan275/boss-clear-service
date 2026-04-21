import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Auth protection is handled client-side in each layout.
// This proxy only handles basic redirects.
export function proxy(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
