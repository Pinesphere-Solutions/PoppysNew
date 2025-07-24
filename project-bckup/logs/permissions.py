from rest_framework.permissions import BasePermission

class IsPoppysUser(BasePermission):
    def has_permission(self, request, view):
        # ✅ Allow superusers (admin)
        if request.user and request.user.is_superuser:
            print("Admin user: You have permission.")
            return True
        
        # ✅ Allow only users in 'Poppys' group
        if request.user and request.user.groups.filter(name='Poppys').exists():
            print("Poppys user: You have permission.")
            return True

        print("Access denied: User does not have permission.")
        return False
