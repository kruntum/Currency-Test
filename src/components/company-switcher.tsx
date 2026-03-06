import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCompanyStore, type Company } from '@/stores/company-store';
import { Building2, ChevronsUpDown, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

export function CompanySwitcher() {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const { companyId } = useParams();
  const { companies, fetchCompanies } = useCompanyStore();
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Set active company based on URL param
  useEffect(() => {
    if (companyId && companies.length > 0) {
      const found = companies.find((c) => c.id === parseInt(companyId));
      if (found) setActiveCompany(found);
    }
  }, [companyId, companies]);

  const handleSelectCompany = (company: Company) => {
    setActiveCompany(company);
    navigate(`/company/${company.id}`);
  };

  const handleManageCompanies = () => {
    navigate('/companies');
  };

  if (companies.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            onClick={handleManageCompanies}
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Plus className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">สร้างบริษัท</span>
              <span className="truncate text-xs text-muted-foreground">เริ่มต้นใช้งาน</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Building2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {activeCompany?.name || 'เลือกบริษัท'}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {activeCompany?.taxId || 'Currency Declaration'}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              บริษัทของคุณ
            </DropdownMenuLabel>
            {companies.map((company) => (
              <DropdownMenuItem
                key={company.id}
                onClick={() => handleSelectCompany(company)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <Building2 className="size-3.5 shrink-0" />
                </div>
                <div className="flex-1 truncate">
                  <div className="truncate font-medium">{company.name}</div>
                  {company.taxId && (
                    <div className="text-xs text-muted-foreground">{company.taxId}</div>
                  )}
                </div>
                {activeCompany?.id === company.id && (
                  <div className="size-2 rounded-full bg-primary" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2" onClick={handleManageCompanies}>
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">จัดการบริษัท</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
