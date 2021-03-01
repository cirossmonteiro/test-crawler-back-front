from django.db import models

SOURCES = [
    ('SCA', 'Secretaria da Cultura'),
    ('SDS', 'Secretaria de Desenvolvimento Social')
]

class Tag(models.Model):
    name = models.CharField(max_length=200, unique=True)

# Create your models here.
class News(models.Model):
    source = models.CharField(max_length=3, choices=SOURCES)
    url = models.CharField(max_length=2083, unique=True)
    title = models.TextField()
    subtitle = models.TextField(null=True)
    published = models.DateTimeField()
    updated = models.DateTimeField(null=True)
    collected = models.DateTimeField(auto_now_add=True)
    main_text = models.TextField()
    tags = models.ManyToManyField(Tag)

