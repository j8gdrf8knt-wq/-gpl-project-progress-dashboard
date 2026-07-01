from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/projects/', views.get_projects, name='get_projects'),
    path('api/projects/save/', views.save_project, name='save_project'),
    path('api/projects/delete/<str:project_id>/', views.delete_project, name='delete_project'),
    path('api/projects/<str:project_id>/expenses/', views.get_expenses, name='get_expenses'),
    path('api/projects/<str:project_id>/expenses/save/', views.save_expense, name='save_expense'),
    path('api/projects/<str:project_id>/expenses/bulk/', views.bulk_save_expenses, name='bulk_save_expenses'),
    path('api/projects/<str:project_id>/expenses/<int:expense_id>/update/', views.update_expense, name='update_expense'),
    path('api/projects/<str:project_id>/expenses/<int:expense_id>/delete/', views.delete_expense, name='delete_expense'),
]