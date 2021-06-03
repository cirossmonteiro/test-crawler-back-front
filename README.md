# test-crawler-back-front



Execution steps:

- Open three terminal windows at root of repository

- Execute each one of these parts below in order

- Don't close any terminal


Terminal 0 - Docker/Postgres:

- docker-compose up

- if you get "ERROR: Couldn't connect to Docker daemon", try using sudo in command above


Terminal 1 - Django Rest:

- python3 -m venv venv

- source venv/bin/activate

- pip install -r requirements.txt

- cd dsb_django

- python manage.py migrate

- python manage.py populate --requests 3

- python manage.py runserver 0.0.0.0:8000


Terminal 2 - React.JS:

- cd dsb_react

- npm install

- npm start


Remarks:

- The command to run web crawler is "python populate --requests r1 r2 r3", which means checking r1 pages of listing for the first source, r2 pages of listing for the second source and r3 pages of listing for the third source, respectively. If only one number is provided, then the script will check for the same number of pages for all sources. If you want to clear existing data (for whatever reason), add '--clear' flag to remove all news and tags previously saved.

- There's a runtime warning when running the populating command above, related to timezone. It can be ignored for our purpose.

- The populating procedure will be ended earlier that expected when finding a news which has an URL already saved in database. In other words, the procedure avoid duplicates by checking URLs.

- Visit localhost:8000 in web browser to access directly the API REST page (layout made by DRF), check endpoints, test filters and orderings, create tags, etc.

- When selecting more than one tag, it will search for news related to at least one of the tags selected, not for news related to all of them together.

- Click anywhere inside the row to read full text.

- There are tooltips for some columns (eg.: source, in other to understand the acronym).

- There is a pagination input (number) below the table.

- You can set an ordering when clicking in arrows located inside header cells, then it will also reset pagination.

- Hours invested: 20~25 hours.
