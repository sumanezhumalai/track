import * as React from 'react'
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core'

import {
  arrayMove,
  defaultAnimateLayoutChanges,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/utils'

// Stable module-level constants
const measuringConfig = {
  droppable: { strategy: MeasuringStrategy.Always }
}

const pointerActivationConstraint = { distance: 10 }

const KanbanContext = createContext({
  columns: {},
  setColumns: () => {},
  getItemId: () => '',
  columnIds: [],
  activeId: null,
  setActiveId: () => {},
  findContainer: () => undefined,
  isColumn: () => false,
  modifiers: undefined
})

const ColumnContext = createContext({
  attributes: {},
  listeners: undefined,
  isDragging: false,
  disabled: false
})

const ItemContext = createContext({
  listeners: undefined,
  isDragging: false,
  disabled: false
})

const IsOverlayContext = createContext(false)

const animateLayoutChanges = (args) => defaultAnimateLayoutChanges({ ...args, wasDragging: true })

const dropAnimationConfig = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: '0.4' } }
  })
}

function Kanban({
  value,
  onValueChange,
  getItemValue,
  children,
  className,
  render,
  onMove,
  modifiers,
  onDragStart: onDragStartProp,
  onDragEnd: onDragEndProp,
  ...props
}) {
  const columns = value
  const setColumns = onValueChange
  const [activeId, setActiveId] = useState(null)

  const columnsRef = useRef(columns)
  columnsRef.current = columns

  const getItemValueRef = useRef(getItemValue)
  getItemValueRef.current = getItemValue

  const onMoveRef = useRef(onMove)
  onMoveRef.current = onMove

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: pointerActivationConstraint }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const columnIds = useMemo(() => Object.keys(columns), [columns])

  const isColumn = useCallback((id) => columnIds.includes(id), [columnIds])

  const findContainer = useCallback(
    (id) => {
      if (isColumn(id)) return id
      const cols = columnsRef.current
      const getId = getItemValueRef.current

      return Object.keys(cols).find(key => cols[key].some(item => getId(item) === id))
    },
    [isColumn]
  )

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id)
    onDragStartProp?.(event)
  }, [onDragStartProp])

  const dragOverRafRef = useRef(null)
  const pendingDragOverRef = useRef(null)

  const handleDragOver = useCallback(
    (event) => {
      if (onMoveRef.current) return

      pendingDragOverRef.current = event
      if (dragOverRafRef.current !== null) return

      dragOverRafRef.current = requestAnimationFrame(() => {
        dragOverRafRef.current = null
        const latestEvent = pendingDragOverRef.current

        pendingDragOverRef.current = null
        if (!latestEvent) return

        const { active, over } = latestEvent

        if (!over) return
        if (isColumn(active.id)) return

        const activeContainer = findContainer(active.id)
        const overContainer = findContainer(over.id)

        if (!activeContainer || !overContainer || activeContainer !== overContainer) return

        const cols = columnsRef.current
        const getId = getItemValueRef.current
        const activeIndex = cols[activeContainer].findIndex((item) => getId(item) === active.id)
        const overIndex = cols[activeContainer].findIndex((item) => getId(item) === over.id)

        if (activeIndex === overIndex) return

        setColumns({
          ...cols,
          [activeContainer]: arrayMove(cols[activeContainer], activeIndex, overIndex)
        })
      })
    },
    [findContainer, isColumn, setColumns]
  )

  const flushPendingDragOver = useCallback(() => {
    if (dragOverRafRef.current !== null) {
      cancelAnimationFrame(dragOverRafRef.current)
      dragOverRafRef.current = null
    }

    pendingDragOverRef.current = null
  }, [])

  const handleDragCancel = useCallback(() => {
    flushPendingDragOver()
    setActiveId(null)
    onDragEndProp?.(null)
  }, [flushPendingDragOver, onDragEndProp])

  const handleDragEnd = useCallback(
    (event) => {
      flushPendingDragOver()

      const { active, over } = event

      setActiveId(null)
      onDragEndProp?.(event)

      if (!over) return

      if (onMoveRef.current && !isColumn(active.id)) {
        const cols = columnsRef.current
        const getId = getItemValueRef.current
        const activeContainer = findContainer(active.id)
        const overContainer = findContainer(over.id)

        if (activeContainer && overContainer) {
          const activeIndex = cols[activeContainer].findIndex((item) => getId(item) === active.id)

          const overIndex = isColumn(over.id)
            ? cols[overContainer].length
            : cols[overContainer].findIndex((item) => getId(item) === over.id)

          onMoveRef.current({ event, activeContainer, activeIndex, overContainer, overIndex })
        }

        return
      }

      if (isColumn(active.id) && isColumn(over.id)) {
        const cols = columnsRef.current
        const keys = Object.keys(cols)
        const activeIndex = keys.indexOf(active.id)
        const overIndex = keys.indexOf(over.id)

        if (activeIndex !== overIndex) {
          const newOrder = arrayMove(keys, activeIndex, overIndex)
          const newColumns = {}

          newOrder.forEach(key => {
            newColumns[key] = cols[key]
          })

          setColumns(newColumns)
        }

        return
      }

      const activeContainer = findContainer(active.id)
      const overContainer = findContainer(over.id)

      if (!activeContainer || !overContainer) return

      const cols = columnsRef.current
      const getId = getItemValueRef.current
      const activeIndex = cols[activeContainer].findIndex((item) => getId(item) === active.id)

      if (activeContainer === overContainer) {
        const overIndex = cols[overContainer].findIndex((item) => getId(item) === over.id)

        if (activeIndex !== overIndex) {
          setColumns({
            ...cols,
            [activeContainer]: arrayMove(cols[activeContainer], activeIndex, overIndex)
          })
        }

        return
      }

      const overItems = cols[overContainer]

      const overIndex = isColumn(over.id) ? overItems.length : overItems.findIndex((item) => getId(item) === over.id)

      const newActiveItems = [...cols[activeContainer]]
      const newOverItems = [...overItems]
      const [movedItem] = newActiveItems.splice(activeIndex, 1)

      newOverItems.splice(overIndex, 0, movedItem)

      setColumns({ ...cols, [activeContainer]: newActiveItems, [overContainer]: newOverItems })
    },
    [findContainer, isColumn, setColumns, flushPendingDragOver, onDragEndProp]
  )

  const stableGetItemId = useCallback((item) => getItemValueRef.current(item), [])

  const contextValue = useMemo(
    () => ({
      columns,
      setColumns,
      getItemId: stableGetItemId,
      columnIds,
      activeId,
      setActiveId,
      findContainer,
      isColumn,
      modifiers
    }),
    [columns, setColumns, stableGetItemId, columnIds, activeId, findContainer, isColumn, modifiers]
  )

  const defaultProps = {
    'data-slot': 'kanban',
    'data-dragging': activeId !== null,
    className: cn(activeId !== null && 'cursor-grabbing!', className),
    children
  }

  return (
    <KanbanContext.Provider value={contextValue}>
      <DndContext
        sensors={sensors}
        modifiers={modifiers}
        measuring={measuringConfig}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {useRender({
          defaultTagName: 'div',
          render,
          props: mergeProps(defaultProps, props)
        })}
      </DndContext>
    </KanbanContext.Provider>
  )
}

function KanbanBoard({ className, render, ...props }) {
  const { columnIds } = useContext(KanbanContext)

  const defaultProps = {
    'data-slot': 'kanban-board',
    className: cn('grid auto-rows-fr gap-4 sm:grid-cols-3', className),
    children: props.children
  }

  return (
    <SortableContext items={columnIds} strategy={rectSortingStrategy}>
      {useRender({
        defaultTagName: 'div',
        render,
        props: mergeProps(defaultProps, props)
      })}
    </SortableContext>
  )
}

function KanbanColumn({ value, className, render, disabled, ...props }) {
  const isOverlay = useContext(IsOverlayContext)

  const {
    setNodeRef,
    transform,
    transition,
    attributes,
    listeners,
    isDragging: isSortableDragging
  } = useSortable({
    id: value,
    disabled: disabled || isOverlay,
    animateLayoutChanges
  })

  const { activeId, isColumn } = useContext(KanbanContext) || {}
  const isColumnDragging = isOverlay ? true : (activeId && isColumn ? isColumn(activeId) : false)

  const style = isOverlay
    ? undefined
    : {
        transition,
        transform: CSS.Transform.toString(transform),
      }

  const defaultProps = isOverlay
    ? {
        'data-slot': 'kanban-column',
        'data-value': value,
        'data-dragging': true,
        className: cn('group/kanban-column flex flex-col', className),
        children: props.children,
      }
    : {
        'data-slot': 'kanban-column',
        'data-value': value,
        'data-dragging': isSortableDragging,
        'data-disabled': disabled,
        ref: setNodeRef,
        style,
        className: cn(
          'group/kanban-column flex flex-col',
          isSortableDragging && 'opacity-50 z-50',
          disabled && 'opacity-50',
          className
        ),
        children: props.children,
      }

  const columnCtxValue = isOverlay
    ? {
        attributes: {},
        listeners: undefined,
        isDragging: true,
        disabled: false,
      }
    : { attributes, listeners, isDragging: isColumnDragging, disabled }

  const renderedContent = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(defaultProps, props),
  })

  return (
    <ColumnContext.Provider value={columnCtxValue}>
      {renderedContent}
    </ColumnContext.Provider>
  )
}

function KanbanColumnHandle({ className, render, cursor = true, ...props }) {
  const { attributes, listeners, isDragging, disabled } = useContext(ColumnContext)

  const defaultProps = {
    'data-slot': 'kanban-column-handle',
    'data-dragging': isDragging,
    'data-disabled': disabled,
    suppressHydrationWarning: true,
    ...attributes,
    ...listeners,
    className: cn(
      'opacity-0 transition-opacity group-hover/kanban-column:opacity-100',
      cursor && (isDragging ? 'cursor-grabbing!' : 'cursor-grab!'),
      className
    ),
    children: props.children
  }

  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(defaultProps, props)
  })
}

function KanbanItem({ value, className, render, disabled, ...props }) {
  const isOverlay = useContext(IsOverlayContext)

  const {
    setNodeRef,
    transform,
    transition,
    attributes,
    listeners,
    isDragging: isSortableDragging
  } = useSortable({
    id: value,
    disabled: disabled || isOverlay,
    animateLayoutChanges
  })

  const { activeId, isColumn } = useContext(KanbanContext)
  const isItemDragging = activeId ? !isColumn(activeId) : false

  const style = isOverlay
    ? undefined
    : {
        transition,
        transform: CSS.Transform.toString(transform)
      }

  const defaultProps = isOverlay
    ? {
        'data-slot': 'kanban-item',
        'data-value': value,
        'data-dragging': true,
        className: cn(className),
        children: props.children
      }
    : {
        'data-slot': 'kanban-item',
        'data-value': value,
        'data-dragging': isSortableDragging,
        'data-disabled': disabled,
        suppressHydrationWarning: true,
        ref: setNodeRef,
        style,
        ...attributes,
        className: cn(isSortableDragging && 'opacity-50 z-50', disabled && 'opacity-50', className),
        children: props.children
      }

  const itemCtxValue = isOverlay
    ? { listeners: undefined, isDragging: true, disabled: false }
    : { listeners, isDragging: isItemDragging, disabled }

  const renderedContent = useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(defaultProps, props)
  })

  return (
    <ItemContext.Provider value={itemCtxValue}>
      {renderedContent}
    </ItemContext.Provider>
  )
}

function KanbanItemHandle({ className, render, cursor = true, ...props }) {
  const { listeners, isDragging, disabled } = useContext(ItemContext)

  const defaultProps = {
    'data-slot': 'kanban-item-handle',
    'data-dragging': isDragging,
    'data-disabled': disabled,
    ...listeners,
    className: cn(cursor && (isDragging ? 'cursor-grabbing!' : 'cursor-grab!'), className),
    children: props.children
  }

  return useRender({
    defaultTagName: 'div',
    render,
    props: mergeProps(defaultProps, props)
  })
}

function KanbanColumnContent({ value, className, render, ...props }) {
  const { columns, getItemId } = useContext(KanbanContext)

  const itemIds = useMemo(() => columns[value].map(getItemId), [columns, getItemId, value])

  const defaultProps = {
    'data-slot': 'kanban-column-content',
    className: cn('flex flex-col gap-2', className),
    children: props.children
  }

  return (
    <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
      {useRender({
        defaultTagName: 'div',
        render,
        props: mergeProps(defaultProps, props)
      })}
    </SortableContext>
  )
}

function KanbanOverlay({ children, className, ...props }) {
  const { activeId, isColumn, modifiers } = useContext(KanbanContext)
  const [mounted, setMounted] = useState(false)

  useLayoutEffect(() => setMounted(true), [])

  const variant = activeId ? (isColumn(activeId) ? 'column' : 'item') : 'item'

  const content =
    activeId && children ? (typeof children === 'function' ? children({ value: activeId, variant }) : children) : null

  if (!mounted) return null

  return createPortal(
    <DragOverlay
      dropAnimation={dropAnimationConfig}
      modifiers={modifiers}
      className={cn('z-50', activeId && 'cursor-grabbing', className)}
      {...props}
    >
      <IsOverlayContext.Provider value={true}>{content}</IsOverlayContext.Provider>
    </DragOverlay>,
    document.body
  )
}

export {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnHandle,
  KanbanItem,
  KanbanItemHandle,
  KanbanColumnContent,
  KanbanOverlay
}
