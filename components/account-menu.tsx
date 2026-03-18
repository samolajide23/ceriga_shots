'use client'

import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Link from 'next/link'

export function AccountMenu() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div className="h-9 w-24 rounded-md bg-muted animate-pulse" />
  }

  if (!session?.user) {
    return (
      <Link href="/login">
        <Button size="sm" variant="outline">
          Sign in
        </Button>
      </Link>
    )
  }

  const initials =
    session.user.name
      ?.split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase() || 'U'

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={session.user.image ?? undefined} alt={session.user.name ?? ''} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-sm font-medium truncate max-w-[160px]">
            {session.user.name ?? session.user.email}
          </span>
          {session.user.email && (
            <span className="text-xs text-muted-foreground truncate max-w-[160px]">
              {session.user.email}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

