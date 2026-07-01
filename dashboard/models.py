from django.db import models
import uuid

def make_project_id():
    return 'proj_' + uuid.uuid4().hex[:10]

class Project(models.Model):
    id = models.CharField(max_length=50, primary_key=True, default=make_project_id)
    name = models.CharField(max_length=200)
    client = models.CharField(max_length=200, blank=True)
    start_date = models.CharField(max_length=20, blank=True)
    target_date = models.CharField(max_length=20, blank=True)
    report_date = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class Activity(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='activities')
    name = models.CharField(max_length=200)
    qty = models.FloatField(default=0)
    unit = models.CharField(max_length=50, blank=True)
    weight_pct = models.FloatField(default=0)
    man_day_rate = models.FloatField(default=0)
    order = models.IntegerField(default=0)

class Area(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='areas')
    name = models.CharField(max_length=200)
    order = models.IntegerField(default=0)

class AreaActivityQuota(models.Model):
    area = models.ForeignKey(Area, on_delete=models.CASCADE, related_name='quotas')
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE)
    qty = models.FloatField(default=0)
    class Meta:
        unique_together = ('area', 'activity')

class DailyLogEntry(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='log_entries')
    date = models.CharField(max_length=20)
    area = models.ForeignKey(Area, on_delete=models.CASCADE)
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE)
    qty_done = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering = ['-date', '-created_at']

class BOQItem(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='items')
    sl = models.IntegerField(default=0)
    desc = models.CharField(max_length=300)
    qty = models.FloatField(default=0)
    unit = models.CharField(max_length=50, blank=True)
    unit_price = models.FloatField(default=0)
    total_price = models.FloatField(default=0)
    total_cost = models.FloatField(default=0)
    offer_price = models.FloatField(default=0)
    order = models.IntegerField(default=0)

class ExpenseEntry(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='expenses')
    date = models.CharField(max_length=20)
    category = models.CharField(max_length=200)
    description = models.CharField(max_length=500)
    amount = models.FloatField(default=0)
    boq_item = models.ForeignKey(BOQItem, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering = ['-date', '-created_at']