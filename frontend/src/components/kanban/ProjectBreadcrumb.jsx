import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { ChevronDownIcon } from 'lucide-react'

export default function ProjectBreadcrumb({ projectName, version, versions = [], onVersionChange, onBack }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            href='#'
            onClick={(e) => { e.preventDefault(); onBack?.() }}
          >
            <Badge variant='outline' className='text-muted-foreground hover:text-foreground cursor-pointer'>
              Features & Modules
            </Badge>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator> / </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbLink href='#' onClick={(e) => e.preventDefault()}>
            <Badge variant='outline' className='text-muted-foreground hover:text-foreground'>
              {projectName}
            </Badge>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator> / </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbPage>
            <DropdownMenu>
              <DropdownMenuTrigger className='flex items-center gap-1 outline-none'>
                <Badge variant='outline' className='cursor-pointer hover:bg-accent'>
                  {version}
                  <ChevronDownIcon className='ml-1 size-3' />
                </Badge>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start'>
                {versions.map(v => (
                  <DropdownMenuItem key={v.versionId} onClick={() => onVersionChange?.(v)}>
                    {v.label || `v${v.versionNumber}`}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
