import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarColor, cn, initials } from "@/lib/utils";

export function UserAvatar({
  name,
  image,
  className,
}: {
  name: string;
  image?: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn("border border-background/40", className)}>
      {image ? <AvatarImage src={image} alt={name} /> : null}
      <AvatarFallback className={cn("font-medium", avatarColor(name))}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
