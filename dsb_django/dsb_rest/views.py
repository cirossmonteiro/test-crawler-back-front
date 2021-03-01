from rest_framework import filters, viewsets
from django_filters.rest_framework import DjangoFilterBackend

from dsb_rest.models import News, Tag
from dsb_rest.serializers import NewsSerializer, TagSerializer


class NewsViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = News.objects.all()
    serializer_class = NewsSerializer
    # filter_backends = [DjangoFilterBackend]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['source', 'tags']
    ordering_fields = ['id', 'source', 'title', 'published', 'collected']

class TagViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = Tag.objects.all()
    serializer_class = TagSerializer