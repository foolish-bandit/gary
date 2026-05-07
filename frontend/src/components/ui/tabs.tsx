import * as React from "react";
import { cn } from "@/lib/utils";

const Tabs = ({ className, ...props }: React.ComponentProps<"div">) => <div className={cn("w-full", className)} {...props} />;
const TabsList = ({ className, ...props }: React.ComponentProps<"div">) => <div className={cn("inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground", className)} {...props} />;
const TabsTrigger = ({ className, ...props }: React.ComponentProps<"button">) => <button className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium", className)} {...props} />;
const TabsContent = ({ className, ...props }: React.ComponentProps<"div">) => <div className={cn("mt-2", className)} {...props} />;

export { Tabs, TabsList, TabsTrigger, TabsContent };
