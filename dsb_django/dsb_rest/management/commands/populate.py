from datetime import datetime
from itertools import chain

import requests
from bs4 import BeautifulSoup

from django.core.management.base import BaseCommand, CommandError
from dsb_rest.models import News, Tag


DATETIME_FORMATS = [
    '%d/%m/%Y %Hh%M',
    'publicado: %d/%m/%Y %Hh%M',
    'última modificação: %d/%m/%Y %Hh%M'
]


# to-do: save this dict in an external .json
SOURCE_URLS = [
    dict(
        src='SDS',
        name='Secretaria de Desenvolvimento Social',
        url='https://www.gov.br/cidadania/pt-br/noticias-e-conteudos/desenvolvimento-social/noticias-desenvolvimento-social?b_start:int=%d',
        type='index',
        size=30,
        start=0,
        first_css_selector='article a.summary.url',
        second_css_selector=dict(title='.documentFirstHeading', subtitle='.documentDescription', main_text='#content-core', published__stdatetime='.documentPublished .value', updated__stdatetime='.documentModified .value', tags__many='.link-category')
    ),
    dict(
        src='SCA',
        name='Secretaria de Cultura',
        url='http://cultura.gov.br/categoria/noticias/page/%d/',
        type='page',
        size=10,
        start=1,
        first_css_selector='#posts-list li.row h2 a',
        second_css_selector=dict(title='.entry-title', subtitle='.subtitle-single p', main_text='.entry-content.position-relative', published__stdatetime='.date-box', updated__stdatetime='.date-box')
    )
]



class Command(BaseCommand):
    help = 'Populate database with news from different sources'

    def add_arguments(self, parser):
        parser.add_argument('--requests', required=True, nargs='+', type=int, help='Number of requests for each source.')
        parser.add_argument('--clear', action='store_true', help='Clear database before inserting new data.')

    def handle(self, *args, **options):

        if options['clear']:
            print('clear')
            News.objects.all().delete()
            Tag.objects.all().delete()
            # return
        
        calls = options['requests']
        if len(calls) not in [1, len(SOURCE_URLS)]:
            raise CommandError(f'Bad value for number of requests. You should provide exactly 1 integer or {len(SOURCE_URLS)} integer(s), not {len(calls)} values.')
        if len(options['requests']) == 1:
            calls = [options['requests'][0] for _ in SOURCE_URLS]
        
        print(f'Starting a total of {sum(calls)} requests.')

        # reading sources
        for i in range(len(SOURCE_URLS)):
            source = SOURCE_URLS[i]

            # reading listing pages
            links = []
            for n in range(calls[i]):
                num = source['start']
                if source['type'] == 'index':
                    num += n*source['size']
                elif source['type'] == 'page':
                    num += n
                url = source['url']%num
                print(f'Downloading {n+1} of {calls[i]} from source {i+1} of {len(SOURCE_URLS)}.')
                print('URL: ', url)
                response = requests.get(url)
                soup = BeautifulSoup(response.text, 'html.parser')
                objs = soup.select(source['first_css_selector'])
                links += [obj['href'] for obj in objs]

            # reading each news
            for link in links:

                # check if news already exists in database
                if News.objects.filter(url=link).exists():
                    print(f"This news\'s already been saved.\nStopping collecting data from source {source['name']}")
                    break

                # print('Downloading ')
                response = requests.get(link)
                soup = BeautifulSoup(response.text, 'html.parser')
                news_data = dict(source=source['src'], url=link)
                many2many = dict()
                for info, css_selector in source['second_css_selector'].items():
                    elements = soup.select(css_selector)
                    raws = [element.text for element in elements] # extract text
                    raws = [raw for raw in raws if raw] # remove 'None'
                    key = info.split('__')[0]
                    special_type = None
                    if '__st' in info:
                        special_type = info.split('__')[1][2:]
                    news_data[key] = []
                    for raw in raws:
                        if special_type == 'datetime':
                            # special case
                            if source['src'] == 'SCA':
                                raw = raw.replace('\n', '')
                                if key == 'published':
                                    raw = raw.split(', ')[0]
                                elif key == 'updated':
                                    raw = raw.split(', ')[1]

                            # testing different datetime formats
                            for test_format in DATETIME_FORMATS:
                                try:
                                    raw = datetime.strptime(raw, test_format)
                                    break
                                except:
                                    pass

                        news_data[key].append(raw)

                    if '__many' in info:
                        if key == 'tags':
                            current_model = Tag
                            print('128tags', news_data[key])
                            existing_tags = current_model.objects.filter(name__in=news_data[key])
                            new_tags = []
                            for tag in news_data[key]:
                                if tag not in [existing_tag.name for existing_tag in existing_tags]:
                                    # create new tag in database
                                    print(136, tag)
                                    new_tag = current_model.objects.create(name=tag)
                                    new_tags.append(new_tag)
                            new_tags = current_model.objects.filter(name__in=new_tags)
                            many2many[key] = list(chain(existing_tags, new_tags))
                            del news_data[key]
                            # news_data[key] = [tag.pk for tag in new_data[key]]
                    else:
                        if len(news_data[key]):
                            news_data[key] = news_data[key][0]
                        else:
                            del news_data[key]
                # we cant directly assign many-to-many when instantiating, so we set these values after that
                
                instance = News.objects.create(**news_data)
                for key, value in many2many.items():
                    attr = getattr(instance, key)
                    attr.set(value)
                instance.save()


