#!/usr/bin/env python
import os
import sys
import django
from datetime import datetime, timedelta
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gpl_site.settings')
django.setup()

from projects.models import Project, Category, Sheet, Teammate, ActionPlanEntry, ProposalChecklist, MeetingTask, ChecklistStepAssignment, ChecklistStepHistory

# Sample data
projects_data = [
    {
        'name': 'Bogura Cantonment Solar Project',
        'description': 'Solar power installation for Bogura Cantonment',
        'status': 'in_progress',
        'budget': 5000000,
        'spent': 2500000,
    },
    {
        'name': 'Dhaka Office Building Renovation',
        'description': 'Complete renovation of office building in Dhaka',
        'status': 'in_progress',
        'budget': 3000000,
        'spent': 1200000,
    },
    {
        'name': 'Chattogram Port Infrastructure',
        'description': 'Infrastructure development at Chattogram Port',
        'status': 'planning',
        'budget': 8000000,
        'spent': 500000,
    },
    {
        'name': 'Sylhet Water Treatment Plant',
        'description': 'Water treatment facility construction',
        'status': 'in_progress',
        'budget': 4500000,
        'spent': 2000000,
    },
]

activities_data = [
    'Site Preparation',
    'Foundation Work',
    'Structural Construction',
    'Electrical Installation',
    'Plumbing Work',
    'Interior Finishing',
    'Quality Testing',
    'Final Inspection',
]

print("🚀 Starting sample data generation...")

for proj_data in projects_data:
    try:
        # Get or create category
        category, _ = Category.objects.get_or_create(code='GEN', defaults={'name': 'General'})

        # Get or create sheet
        sheet, _ = Sheet.objects.get_or_create(name='Default Sheet')

        # Create project
        project = Project.objects.create(
            name=proj_data['name'],
            description=proj_data['description'],
            status=proj_data['status'],
            budget=proj_data['budget'],
            spent=proj_data['spent'],
            category=category,
            sheet=sheet,
            start_date=datetime.now() - timedelta(days=random.randint(30, 180)),
            end_date=datetime.now() + timedelta(days=random.randint(30, 180)),
        )
        print(f"✓ Created project: {project.name}")

        # Add action plan entries
        for i, activity in enumerate(activities_data[:4]):
            ActionPlanEntry.objects.create(
                project=project,
                description=activity,
                start_date=datetime.now() + timedelta(days=i*10),
                end_date=datetime.now() + timedelta(days=(i+1)*10),
                status='pending' if i > 1 else 'in_progress',
                priority='high' if i == 0 else 'medium',
            )

        # Create proposal checklist
        checklist = ProposalChecklist.objects.create(project=project)
        print(f"  ✓ Created checklist for {project.name}")

    except Exception as e:
        print(f"✗ Error creating project {proj_data['name']}: {e}")

print("\n✅ Sample data generation complete!")
print("📊 You can now test the app with sample projects, activities, and checklists.")
