import clsx from 'clsx'
import { Input, Label } from './ui'

export function ListSearchBar({
  value,
  onChange,
  placeholder = 'Filter by name, text…',
  id = 'list-filter',
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  id?: string
  className?: string
}) {
  return (
    <div className={clsx('max-w-md flex-1', className)}>
      <Label htmlFor={id}>Filter list</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
    </div>
  )
}
