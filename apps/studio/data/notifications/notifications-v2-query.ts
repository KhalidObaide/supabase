import { useInfiniteQuery, UseInfiniteQueryOptions } from '@tanstack/react-query'
import { get } from 'data/fetchers'

import { components } from 'data/api'
import { ResponseError } from 'types'
import { notificationKeys } from './keys'

const NOTIFICATIONS_PAGE_LIMIT = 10

export type NotificationVariables = {
  // archived: boolean
  page: number
  limit?: number
  status?: 'new' | 'seen' | 'archived'
  priority?: 'Critical' | 'Warning' | 'Info'
}

export type Notification = components['schemas']['NotificationResponseV2']

/**
 * Notification Data - This is not typed from the API end as it's meant to be open-ended
 * @param title: Title of the notification
 * @param message: Rendered as Markdown to support inline links. Should be capped to n characters
 * @param project_id: (Optional) Only available if notification is specifically for a project (e.g exhaustion notification)
 * @param actions: (Optional) Any sort of actions that we want to provide users, could be external link, could be something that needs to be handled on FE
 */
export type NotificationData = {
  title: string
  message: string
  org_slug?: string
  project_ref?: string
  actions: { label: string; url?: string; action_type?: string }[]
}

export async function getNotifications(options: NotificationVariables, signal?: AbortSignal) {
  const { page = 0, limit = NOTIFICATIONS_PAGE_LIMIT, status, priority } = options
  const { data, error } = await get('/platform/notifications', {
    params: {
      // @ts-ignore
      query: {
        offset: page * limit,
        limit,
        ...(status !== undefined ? { status } : { status: ['new', 'seen'] }),
        ...(priority !== undefined ? { priority } : {}),
      },
    },
    headers: { Version: '2' },
    signal,
  })

  if (error) throw error

  return data
}

export type NotificationsData = Awaited<ReturnType<typeof getNotifications>>
export type NotificationsError = ResponseError

export const useNotificationsV2Query = <TData = NotificationsData>(
  { status, priority, limit = NOTIFICATIONS_PAGE_LIMIT }: Omit<NotificationVariables, 'page'>,
  {
    enabled = true,
    ...options
  }: UseInfiniteQueryOptions<NotificationsData, NotificationsError, TData> = {}
) => {
  return useInfiniteQuery<NotificationsData, NotificationsError, TData>(
    notificationKeys.listV2({ status, priority, limit }),
    ({ signal, pageParam }) =>
      getNotifications({ status, priority, limit, page: pageParam }, signal),
    {
      enabled: enabled,
      getNextPageParam(lastPage, pages) {
        const page = pages.length
        if (lastPage.length < limit) return undefined
        return page
      },
      ...options,
    }
  )
}
