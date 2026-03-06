import * as React from "react"
import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  Coins,
  ArrowDownToLine,
  Landmark,
  UserSquare2,
} from "lucide-react"

import { NavUser } from "@/components/nav-user"
import { CompanySwitcher } from "@/components/company-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
import { Link, useLocation, useParams } from "react-router-dom"
import { useSession } from "@/lib/auth-client"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  const { companyId } = useParams()
  const { data: session } = useSession()
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin'

  // Company-scoped navigation items
  const navItems = companyId
    ? [
        { title: "แดชบอร์ด", url: `/company/${companyId}`, icon: LayoutDashboard },
        { title: "ลูกค้า", url: `/company/${companyId}/customers`, icon: UserSquare2 },
        { title: "รายการ (Transactions)", url: `/company/${companyId}/transactions`, icon: FileText },
        { title: "รับเงิน", url: `/company/${companyId}/receipts`, icon: ArrowDownToLine },
        { title: "คลัง (FCD)", url: `/company/${companyId}/treasury`, icon: Landmark },
        { title: "บริษัท", url: "/companies", icon: Building2 },
        ...(isAdmin ? [
          { title: "ผู้ใช้", url: "/admin/users", icon: Users },
          { title: "สกุลเงิน", url: "/admin/currencies", icon: Coins },
        ] : []),
      ]
    : [
        { title: "บริษัท", url: "/companies", icon: Building2 },
        ...(isAdmin ? [
          { title: "ผู้ใช้", url: "/admin/users", icon: Users },
          { title: "สกุลเงิน", url: "/admin/currencies", icon: Coins },
        ] : []),
      ]

  const userStub = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "",
    avatar: "",
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <CompanySwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>เมนูหลัก</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={location.pathname === item.url} tooltip={item.title}>
                  <Link to={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
         <NavUser user={userStub} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
