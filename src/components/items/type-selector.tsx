import { File } from "lucide-react"
import { FormField } from "@/components/items/form-field"
import { iconMap } from "@/lib/icon-map"
import type { SidebarItemType } from "@/lib/db/sidebar"
import { cn } from "@/lib/utils"
import { ProBadge } from "@/components/billing/plan-badge"

interface TypeSelectorProps {
  types: SidebarItemType[]
  selected: string
  onSelect: (name: string) => void
}

/** Grid of item-type buttons for the create dialog; the selected type is tinted in its own color. */
export function TypeSelector({ types, selected, onSelect }: TypeSelectorProps) {
  return (
    <FormField label="Type">
      <div className="grid grid-cols-4 gap-2">
        {types.map((type) => {
          const Icon = iconMap[type.icon] ?? File
          const isSelected = type.name === selected
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => onSelect(type.name)}
              className={cn(
                "relative flex flex-col items-center gap-1.5 rounded-md border p-2.5 text-xs capitalize transition-colors",
                isSelected ? "bg-accent" : "border-border text-muted-foreground hover:bg-accent"
              )}
              style={isSelected ? { borderColor: type.color, color: type.color } : undefined}
            >
              {/* Pro-only types were visually identical to free ones here. */}
              {type.isPro && (
                <ProBadge
                  size="sm"
                  className="absolute right-1 top-1 px-1 text-[9px] leading-3.5"
                />
              )}
              <Icon className="h-4 w-4" style={{ color: type.color }} />
              {type.name}
            </button>
          )
        })}
      </div>
    </FormField>
  )
}
