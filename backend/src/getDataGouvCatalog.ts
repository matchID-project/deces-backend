import axios from 'axios';

interface DatagouvCatalog {
  data: {
    resources: any;
  }
}

interface Catalog {
  [key: string]: any; // Index signature
}

const dataGouvRewrite = {
    title: [/deces-(.*).txt/,'$1'],
    url: [process.env.DATAGOUV_RESOURCES_URL, process.env.DATAGOUV_PROXY_PATH]
};

const getDataGouvCatalog = async (): Promise<any> => {
  const response: DatagouvCatalog = await axios.get(process.env.DATAGOUV_CATALOG_URL);
  const resources = await response.data.resources;
  if (resources) {
    const catalog: Catalog = {};
    resources.forEach((r: any) => {
      if (r.url && r.title) {
        catalog[r.title.replace(dataGouvRewrite.title[0],dataGouvRewrite.title[1])] = r.url.replace(dataGouvRewrite.url[0], dataGouvRewrite.url[1])
      }
    });
    return catalog
  } else {
    return null
  }
}

export let catalogData: any;

getDataGouvCatalog().then(response => {
  catalogData = response
})

export default getDataGouvCatalog
