import { resolve, relative } from 'path';
import { realpathSync, existsSync, readFileSync } from 'fs';
import stripJsonComments from 'strip-json-comments';
import parseJSON from 'parse-json-pretty';
import placeholder from 'replace-holder';
import rimraf from 'rimraf';

export function getPaths(cwd) {
  const appDir = realpathSync(cwd);
  const ownDir = resolve(__dirname, '../');

  function resolveApp(relativePath) {
    return resolve(appDir, relativePath);
  }

  function resolveOwn(relativePath) {
    return resolve(ownDir, relativePath);
  }

  return {
    ownDir,
    appDir,
    resolveApp,
    resolveOwn,
    relativeAppDir: (absolutePath) => relative(appDir, absolutePath),
    bPath: (name) => resolveOwn(`boilerplates/${name}`),
  };
}

export function getRcConfig(rcFilename, paths) {
  const jsRcPath = paths.resolveApp(`${rcFilename}.js`);
  const rcPath = paths.resolveApp(rcFilename);

  if (existsSync(jsRcPath)) {
    return require(jsRcPath);
  } else if (existsSync(rcPath)) {
    return parseJSON(stripJsonComments(readFileSync(rcPath, 'utf8')), rcFilename);
  } else {
    return {};
  }
}
// type: routes, source,
export function getRoutesOrSource(rcConfig, type, paths) {
  let finalResult = null;
  const docsBase = paths.resolveApp('docs');
  if (type === 'routes') {
    finalResult = [];
    if ('home' in rcConfig) {
      let cur = rcConfig.home;
      const route = {};
      route.isHome = true;
      route.path = cur.path || '/';
      route.component = './template/' + cur.component;
      finalResult.push(route);
    }

    finalResult.push({
      path: '/:type/:doc',
      component: './template/Doc',
    });

  } else if(type === 'source') {
    // copy home
    if('home' in rcConfig) {
      let cur = rcConfig.home;
      let componentPath = resolve(docsBase, cur.component);
      componentPath = componentPath + '/**';
      const targetDir = paths.resolveOwn(`lib/site/theme/template/${cur.component}`);
      if(existsSync(targetDir)) {
        rimraf.sync(targetDir);
      }
      placeholder.fileSync(componentPath, {}, targetDir);
    }

    finalResult = {};
    if ('component' in rcConfig) {
      let cur = rcConfig.component;
      finalResult.component = (Array.isArray(cur.source) && cur.source.length > 1)
        ? [paths.resolveApp(cur.source[0]), resolve(docsBase, cur.source[1])]
        : paths.resolveApp(cur.source[0] || cur.sourc);
    }

    if ('articles' in rcConfig) {
      let cur = rcConfig.articles;
      const articles = Array.isArray(cur) ? cur : [cur];
      articles.reduce(function (result, article) {
        result[article.source] = resolve(docsBase, article.source);
      }, finalResult);
    }
  } else if(type === 'themeConfig') {
    finalResult = {};
    if ('component' in rcConfig) {
      let cur = rcConfig.component;
      if ('typeOrder' in cur) {
        cur.bishengConfig = cur.bishengConfig || {};
        cur.bishengConfig.themeConfig = cur.bishengConfig.themeConfig || {};
        finalResult = {
          ...cur.bishengConfig.themeConfig,
          typeOrder: cur.typeOrder,
        };
      }
    }
  }

  return finalResult;
}