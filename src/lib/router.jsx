import { useState, useEffect, useSyncExternalStore } from 'react'

const listeners = new Set()

function getHash() {
  return window.location.hash.slice(1) || '/'
}

function subscribe(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function notify() {
  for (const cb of listeners) cb()
}

window.addEventListener('hashchange', notify)

export function useRoute() {
  return useSyncExternalStore(subscribe, getHash, () => '/')
}

export function navigate(path) {
  window.location.hash = path
}

export function Link({ to, children, className, ...rest }) {
  return (
    <a
      href={`#${to}`}
      className={className}
      onClick={(e) => {
        e.preventDefault()
        navigate(to)
      }}
      {...rest}
    >
      {children}
    </a>
  )
}
