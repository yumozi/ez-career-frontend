import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton
} from "@/components/ui/sidebar";
import { FaBriefcase, FaUser, FaChartBar, FaCog, FaFileAlt, FaBell, FaHistory, FaSignOutAlt, FaSearch, FaExclamationTriangle, FaQuestionCircle } from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

export function AppSidebar() {
  const { pathname } = useLocation();
  const { signOut } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="flex items-center gap-2 px-6">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-primary p-1.5 text-primary-foreground">
            <FaBriefcase className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold">EZ Career</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/" className={pathname === "/" ? "text-primary font-medium" : ""}>
                    <FaChartBar className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/applications" className={pathname === "/applications" ? "text-primary font-medium" : ""}>
                    <FaBriefcase className="h-4 w-4" />
                    <span>Applications</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/apply" className={pathname === "/apply" ? "text-primary font-medium" : ""}>
                    <FaSearch className="h-4 w-4" />
                    <span>Apply</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/questions" className={pathname === "/questions" ? "text-primary font-medium" : ""}>
                    <FaQuestionCircle className="h-4 w-4" />
                    <span>Questions</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/profile" className={pathname === "/profile" ? "text-primary font-medium" : ""}>
                    <FaUser className="h-4 w-4" />
                    <span>My Profile</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Activities</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/notifications" className={pathname === "/notifications" ? "text-primary font-medium" : ""}>
                    <FaBell className="h-4 w-4" />
                    <span>Notifications</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/agent-assistance" className={pathname === "/agent-assistance" ? "text-primary font-medium" : ""}>
                    <FaExclamationTriangle className="h-4 w-4" />
                    <span>Agent Assistance</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/history" className={pathname === "/history" ? "text-primary font-medium" : ""}>
                    <FaHistory className="h-4 w-4" />
                    <span>Application History</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-6">
        <div className="flex items-center justify-between w-full">
          <SidebarMenu className="flex-1">
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="w-full">
                <Link to="/settings" className={pathname === "/settings" ? "text-primary font-medium" : ""}>
                  <FaCog className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <button
            onClick={signOut}
            className="flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent hover:text-accent-foreground"
            aria-label="Logout"
          >
            <FaSignOutAlt className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
