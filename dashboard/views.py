import json
from datetime import datetime
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Sum, Min, Count, Q
from .models import Project, Activity, Area, AreaActivityQuota, DailyLogEntry, BOQItem, ExpenseEntry

def index(request):
    return render(request, 'dashboard/index.html')

def compute_activity_summary(project, activity, report_date):
    logs = DailyLogEntry.objects.filter(project=project, activity=activity).order_by('date')

    # Today's achievement
    today_achieve = logs.filter(date=report_date).aggregate(Sum('qty_done'))['qty_done__sum'] or 0

    # Total present (all work up to and including report_date)
    total_present = logs.filter(date__lte=report_date).aggregate(Sum('qty_done'))['qty_done__sum'] or 0

    # Start date (first day work was done)
    start_date = logs.first().date if logs.exists() else None

    return {
        'todayAchiev': float(today_achieve),
        'totalPresent': float(total_present),
        'startDate': start_date,
    }

def get_projects(request):
    projects = {}
    for p in Project.objects.all():
        activities = list(p.activities.order_by('order').values('id', 'name', 'qty', 'unit', 'weight_pct', 'man_day_rate'))
        areas = list(p.areas.order_by('order').values('id', 'name'))
        logs = list(p.log_entries.order_by('-date', '-created_at').values('id', 'date', 'area_id', 'activity_id', 'qty_done'))
        items = list(p.items.order_by('order').values())
        expenses = list(p.expenses.order_by('-date').values('id', 'date', 'category', 'description', 'amount', 'remarks'))

        # Compute summaries for each activity (totals from logs)
        activity_summaries = {}
        for a in activities:
            summary = compute_activity_summary(p, p.activities.get(id=a['id']), p.report_date or '')
            activity_summaries[a['id']] = summary

        projects[p.id] = {
            'id': p.id, 'name': p.name, 'client': p.client,
            'startDate': p.start_date, 'targetDate': p.target_date,
            'reportDate': p.report_date,
            'activities': [{
                'id': a['id'], 'name': a['name'], 'qty': a['qty'], 'unit': a['unit'],
                'weightPct': a['weight_pct'], 'manDayRate': a['man_day_rate'],
                **activity_summaries[a['id']]
            } for a in activities],
            'areas': areas,
            'logs': logs,
            'items': [{
                'sl': i['sl'], 'desc': i['desc'], 'qty': i['qty'],
                'unit': i['unit'], 'unitPrice': i['unit_price'],
                'totalPrice': i['total_price'], 'totalCost': i['total_cost'],
                'offerPrice': i['offer_price']
            } for i in items],
            'expenses': expenses
        }
    return JsonResponse(projects)

@csrf_exempt
def save_project(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=400)
    data = json.loads(request.body)
    p, _ = Project.objects.update_or_create(
        id=data['id'],
        defaults={
            'name': data['name'], 'client': data.get('client',''),
            'start_date': data.get('startDate',''), 'target_date': data.get('targetDate',''),
            'report_date': data.get('reportDate','')
        }
    )
    # Save activities
    p.activities.all().delete()
    for i, a in enumerate(data.get('activities',[])):
        Activity.objects.create(
            project=p, order=i, name=a['name'], qty=a.get('qty',0), unit=a.get('unit',''),
            weight_pct=a.get('weightPct',0), man_day_rate=a.get('manDayRate',0)
        )
    # Save areas
    p.areas.all().delete()
    for i, ar in enumerate(data.get('areas',[])):
        Area.objects.create(project=p, order=i, name=ar['name'])
    # Save logs
    DailyLogEntry.objects.filter(project=p).delete()
    for log_data in data.get('logs',[]):
        try:
            area = p.areas.get(id=log_data['area_id'])
            activity = p.activities.get(id=log_data['activity_id'])
            DailyLogEntry.objects.create(
                project=p, date=log_data['date'],
                area=area, activity=activity, qty_done=log_data['qty_done']
            )
        except:
            pass
    # Save BOQ items
    p.items.all().delete()
    for i, item in enumerate(data.get('items',[])):
        BOQItem.objects.create(
            project=p, order=i, sl=item.get('sl',i+1), desc=item.get('desc',''),
            qty=item.get('qty',0), unit=item.get('unit',''),
            unit_price=item.get('unitPrice',0), total_price=item.get('totalPrice',0),
            total_cost=item.get('totalCost',0), offer_price=item.get('offerPrice',0)
        )
    return JsonResponse({'ok': True})

@csrf_exempt
def delete_project(request, project_id):
    Project.objects.filter(id=project_id).delete()
    return JsonResponse({'ok': True})

@csrf_exempt
def get_expenses(request, project_id):
    try:
        project = Project.objects.get(id=project_id)
        expenses = list(project.expenses.order_by('-date').values())
        return JsonResponse({
            'expenses': expenses,
            'total': sum(e['amount'] for e in expenses)
        })
    except Project.DoesNotExist:
        return JsonResponse({'error': 'Project not found'}, status=404)

@csrf_exempt
def save_expense(request, project_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=400)
    try:
        project = Project.objects.get(id=project_id)
        data = json.loads(request.body)

        expense = ExpenseEntry.objects.create(
            project=project,
            date=data.get('date', ''),
            category=data.get('category', ''),
            description=data.get('description', ''),
            amount=float(data.get('amount', 0)),
            remarks=data.get('remarks', '')
        )

        if data.get('boqItemId'):
            try:
                boq_item = BOQItem.objects.get(id=data['boqItemId'])
                expense.boq_item = boq_item
                expense.save()
            except:
                pass

        return JsonResponse({
            'id': expense.id,
            'date': expense.date,
            'category': expense.category,
            'description': expense.description,
            'amount': expense.amount
        })
    except Project.DoesNotExist:
        return JsonResponse({'error': 'Project not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
def update_expense(request, project_id, expense_id):
    if request.method != 'PUT':
        return JsonResponse({'error': 'PUT required'}, status=400)
    try:
        project = Project.objects.get(id=project_id)
        expense = ExpenseEntry.objects.get(id=expense_id, project=project)
        data = json.loads(request.body)

        expense.date = data.get('date', expense.date)
        expense.category = data.get('category', expense.category)
        expense.description = data.get('description', expense.description)
        expense.amount = float(data.get('amount', expense.amount))
        expense.remarks = data.get('remarks', expense.remarks)
        expense.save()

        return JsonResponse({'ok': True})
    except (Project.DoesNotExist, ExpenseEntry.DoesNotExist):
        return JsonResponse({'error': 'Not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
def delete_expense(request, project_id, expense_id):
    if request.method != 'DELETE':
        return JsonResponse({'error': 'DELETE required'}, status=400)
    try:
        project = Project.objects.get(id=project_id)
        expense = ExpenseEntry.objects.get(id=expense_id, project=project)
        expense.delete()
        return JsonResponse({'ok': True})
    except (Project.DoesNotExist, ExpenseEntry.DoesNotExist):
        return JsonResponse({'error': 'Not found'}, status=404)

@csrf_exempt
def bulk_save_expenses(request, project_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=400)
    try:
        project = Project.objects.get(id=project_id)
        data = json.loads(request.body)
        expenses_data = data.get('expenses', [])

        created = 0
        errors = []

        for idx, exp_data in enumerate(expenses_data):
            try:
                expense = ExpenseEntry.objects.create(
                    project=project,
                    date=exp_data.get('date', ''),
                    category=exp_data.get('category', ''),
                    description=exp_data.get('description', ''),
                    amount=float(exp_data.get('amount', 0)),
                    remarks=exp_data.get('remarks', '')
                )
                created += 1
            except Exception as e:
                errors.append({'row': idx + 1, 'error': str(e)})

        return JsonResponse({'created': created, 'errors': errors})
    except Project.DoesNotExist:
        return JsonResponse({'error': 'Project not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)
