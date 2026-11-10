import { Info, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { DevRow, DevSection } from './DevSection'

export function DevControls() {
  return (
    <>
      <DevSection id="buttons" title="Buttons">
        <DevRow label="Variants">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Delete</Button>
          <Button variant="link">Link</Button>
        </DevRow>
        <DevRow label="Sizes, icon and disabled">
          <Button size="sm">Small</Button>
          <Button>
            <Plus /> With icon
          </Button>
          <Button size="icon" variant="secondary" aria-label="Information">
            <Info />
          </Button>
          <Button disabled>Disabled</Button>
        </DevRow>
        <DevRow label="Toast">
          <Button variant="secondary" onClick={() => toast("Saving isn't available yet")}>
            Show toast
          </Button>
        </DevRow>
      </DevSection>

      <DevSection id="inputs" title="Inputs">
        <div className="grid max-w-xl gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="d-name">Full name</Label>
            <Input id="d-name" placeholder="As on your college record" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="d-err">Email</Label>
            <Input
              id="d-err"
              aria-invalid="true"
              aria-describedby="d-err-msg"
              defaultValue="name@"
            />
            <p id="d-err-msg" className="text-sm text-danger">
              Enter a valid email address
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="d-dis">Roll number</Label>
            <Input id="d-dis" disabled defaultValue="Disabled field" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="d-ta">Notes</Label>
            <Textarea id="d-ta" placeholder="Plain text" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="d-sel">Department</Label>
            <Select>
              <SelectTrigger id="d-sel">
                <SelectValue placeholder="Select a department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a">Option A</SelectItem>
                <SelectItem value="b">Option B</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DevRow label="Checkbox, radio, switch">
          <div className="flex items-center gap-2">
            <Checkbox id="d-c1" defaultChecked />
            <Label htmlFor="d-c1">Checked</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="d-c2" />
            <Label htmlFor="d-c2">Unchecked</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="d-c3" disabled />
            <Label htmlFor="d-c3">Disabled</Label>
          </div>
          <RadioGroup defaultValue="one" className="flex gap-4" aria-label="Example radio group">
            <div className="flex items-center gap-2">
              <RadioGroupItem id="d-r1" value="one" />
              <Label htmlFor="d-r1">One</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem id="d-r2" value="two" />
              <Label htmlFor="d-r2">Two</Label>
            </div>
          </RadioGroup>
          <div className="flex items-center gap-2">
            <Switch id="d-sw" defaultChecked />
            <Label htmlFor="d-sw">Enabled</Label>
          </div>
        </DevRow>
      </DevSection>

      <DevSection id="display" title="Badges, progress, avatar, skeleton">
        <DevRow label="Badges">
          <Badge>Neutral</Badge>
          <Badge variant="primary">Primary</Badge>
          <Badge variant="outline">Outline</Badge>
        </DevRow>
        <DevRow label="Progress">
          <Progress value={40} className="w-64" aria-label="Example progress" />
        </DevRow>
        <DevRow label="Avatar">
          <Avatar>
            <AvatarFallback>AB</AvatarFallback>
          </Avatar>
        </DevRow>
        <DevRow label="Skeleton and separator">
          <Skeleton className="h-4 w-48" />
          <Separator className="w-24" />
        </DevRow>
      </DevSection>
    </>
  )
}
