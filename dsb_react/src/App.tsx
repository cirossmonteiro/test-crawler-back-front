import React, { useEffect, useState } from 'react';
import './App.scss';
import axios from 'axios';
import { camelKeys, snakeKeys } from 'js-convert-case';

const convertObj = (obj: any) => camelKeys(obj, { recursive: true });

const API_HOST = process.env.REACT_APP_API_HOST, API_PORT = process.env.REACT_APP_API_PORT;
const API_ADDRESS = `${API_HOST}:${API_PORT}`;

axios.defaults.baseURL = API_ADDRESS;

axios.interceptors.request.use((config) => {
  console.log(12, 'config', config);
  let obj = config.data;
  console.log(12, 'before', obj);
  obj = snakeKeys(obj, { recursive: true });
  config.data = obj;
  console.log(12, config)
  return config;
}, function (error) {
  return Promise.reject(error);
});


axios.interceptors.response.use((response) => {
  if (Array.isArray(response?.data?.results)) {
    response.data.results = response.data.results
      .map((result: any) => convertObj(result));
  } else {
    response.data = camelKeys(response.data, { recursive: true });
  }
  // console.log(30, response);
  return response;
});

const SIZE = 20;
const maxPages = 10;
const filtersAvailable = ['id', 'source', 'title', 'published', 'collected']
const tooltipsAvailable = ['source', 'url', 'title', 'subtitle'];

const loadDataFromAPI = async (offset: number = 0, ordering: any = { 'id': 'descending' }, tags: string[] = []) => {
  const orderingString = Object.keys(ordering).reduce((s1, s2) => s1 + (s1 !== '' ? ',' : '') + (ordering[s2] == 'descending' ? '-' : '') + s2, '');
  const tagFilter = tags.map(tag => `&tags=${tag}`).reduce((s1, s2) => s1 + s2, '');
  const response = await axios.get(`/news?offset=${offset}&ordering=${orderingString}${tagFilter}`);
  return response.data
}

const loadOptionsFromAPI = async () => (await axios.options(`${API_HOST}/news`)).data;

const loadTagsFromAPI = async () => {
  let count = SIZE;
  let tags: ITag[] = [];
  for (let offset = 0; offset < count; offset += SIZE) {
    const response = await axios.get(`/tags?offset=${offset}`);
    count = response.data.count;
    tags = tags.concat(response.data.results);
  }
  return tags;
}


interface INews {
  id: string,
  source: string,
  url: string,
  title: string,
  subtitle: string,
  published: string,
  updated?: string,
  collected: string,
  mainText: string,
  tags: string[]
}

interface ITag {
  id: string,
  name: string
}

interface ISource {
  value: string,
  display_name: string
}

interface IState {
  currentOffset: number;
  sources: ISource[],
  count: number,
  results: INews[],
  articleText: string,
  tags: ITag[],
  tagActive: string[],
  ordering: any,
  textOpened: number
}

const initialState: IState = {
  currentOffset: 0,
  sources: [],
  count: 0,
  results: [],
  articleText: '',
  tags: [],
  tagActive: [],
  ordering: { 'id': 'descending' },
  textOpened: -1
}

const App = () => {

  const [state, setState] = useState<IState>(initialState);
  const { textOpened, currentOffset, articleText, sources, count, results, tags, tagActive, ordering } = state;

  console.log(65, state);

  const loadSources = async () => {
    const data = await loadOptionsFromAPI();
    console.log(85, data);
    setState(state => ({ ...state, sources: data.actions.post.source.choices }));
  }

  const loadTags = async () => {
    const data = await loadTagsFromAPI();
    setState(state => ({ ...state, tags: data }));
  }

  console.log(128, process.env);

  useEffect(() => {
    console.log(128, API_ADDRESS, process.env);
    loadTags();
    loadSources();
  }, []);

  useEffect(() => {
    const loadData = async (offset: number = 0, ordering: any = { 'id': 'descending' }, tags: string[] = []) => {
      const data = await loadDataFromAPI(offset, ordering, tags);
      setState(state => ({ ...state, ...data }));
    }
    loadData(currentOffset, ordering, tagActive);
  }, [currentOffset, ordering, tagActive]);

  const header = results.length > 0 ? Object.keys(results[0]) : [];
  console.log(77, header);
  const headerHTML = header.map(name => (
    <th data-name={name} scope="col">
      {name}
      {filtersAvailable.includes(name) && <>
        <i title="ascending order" className="fas fa-arrow-circle-up" onClick={_ => setState(state => ({ ...state, currentOffset: 0, ordering: { [name]: 'ascending' } }))}></i>
        <i title="descending order" className="fas fa-arrow-circle-down" onClick={_ => setState(state => ({ ...state, currentOffset: 0, ordering: { [name]: 'descending' } }))}></i>
      </>}
    </th>
  ));
  const resultsHTML = results.map((row, rowIndex) => {
    const rowHTML = header.map(col => {
      let value = (row as any)[col], tooltip = '';

      if (value === null || value === '')
        value = '(no value)';

      if (tooltipsAvailable.includes(col))
        tooltip = value;
      if (col === 'source')
        tooltip = sources.find(source => source.value === value)?.display_name || '';

      if (col === 'tags') {
        const tagsHTML = value.map((tag: string) => <span className="mr-1 badge badge-dark">{tags.find(t => t.id === tag)?.name}</span>)
        return <td title={tooltip} className="cell">{tagsHTML}</td>;
      }
      else if (typeof value === 'string' && (value.slice(0, 4) === 'http' || value.slice(0, 3) === 'www'))
        return <td title={tooltip} className="cell"><a onClick={e => e.stopPropagation()} href={value} target="_blank">{String(value).slice(0, 20)}</a></td>;
      else
        return <td title={tooltip} className="cell">{String(value).slice(0, 20)}</td>;
    });
    return (<>
      <tr onClick={_ => setState(state => ({ ...state, textOpened: (state.textOpened === rowIndex ? -1 : rowIndex) }))}>
        {rowHTML}
      </tr>
      {textOpened === rowIndex && <tr><td colSpan={header.length}>
        {row.mainText}
        <button className="btn btn-secondary" onClick={_ => setState(state => ({ ...state, textOpened: -1 }))}>close</button>
      </td></tr>}
    </>)
  })

  const paginationHTML = Array.apply(null, Array(Math.ceil(count / SIZE))).map((_, index) =>
    <div onClick={_ => setState(state => ({ ...state, currentOffset: SIZE * index }))} className={`p-2 m-1 pagination-item${currentOffset === index * SIZE ? ' selected' : ''}`}>{index + 1}</div>);
  // const paginationHTML = Array.apply(null, Array(maxPages).map((_, index) =>
  // <div onClick={_ => setState(state => ({...state, currentOffset: SIZE*index}))} className={`p-2 m-1 pagination-item${currentOffset === index*SIZE ? ' selected' : ''}`}>{index+1}</div>);

  const tagsHTML = tags.map(tag => <span onClick={_ => setState(state => ({ ...state, currentOffset: 0, tagActive: state.tagActive.includes(tag.id) ? state.tagActive.filter(tag2 => tag.id !== tag2) : state.tagActive.concat([tag.id]) }))}
    className={`mr-1 btn btn-outline-primary ${tagActive.includes(tag.id) ? 'active' : ''}`}>{tag.name}</span>);

  return (
    <div>
      <div className="root-tags m-2 p-2">
        {tagsHTML.length > 0 && tagsHTML}
        {tagsHTML.length === 0 && <h2>loading tags...</h2>}
      </div>
      <table className="table">
        <thead>
          <tr>
            {headerHTML}
          </tr>
        </thead>
        <tbody>
          {resultsHTML}
        </tbody>
      </table>
      <div className="d-flex justify-content-end">
        {/* {paginationHTML} */}
        <div className="input-group-prepend">
          <div className="input-group-prepend">
            <span className="input-group-text">Page number (max {Math.ceil(count / SIZE)})</span>
          </div>
          <input className="form-control" type="number" min="1" max={Math.ceil(count / SIZE)} value={Math.round(currentOffset / SIZE) + 1}
            onChange={e => setState(state => ({ ...state, currentOffset: SIZE * (parseInt(e.target.value) - 1) }))} />
        </div>
      </div>

      <div>
        {articleText}
      </div>
    </div>
  );
}

export default App;
