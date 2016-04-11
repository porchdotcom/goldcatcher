import Q from 'q';
import GitHubApi from 'github';
import nconf from 'nconf';
import debug from 'debug';

const log = debug('porch:goldkeeper:github');

const PAGE_LENGTH = 100;

export const fetchRepos = () => {
    log('fetchRepos');

    const github = new GitHubApi({
        version: '3.0.0'
    });
    github.authenticate({
        type: 'token',
        token: nconf.get('GITHUB_API_TOKEN')
    });

    const getReposPage = page => {
        const defer = Q.defer();
        github.repos.getFromOrg({
            org: nconf.get('GITHUB_ORG'),
            page: page,
            per_page: PAGE_LENGTH
        }, defer.makeNodeResolver());
        return defer.promise.then(pageRepos => {
            if (pageRepos.length === PAGE_LENGTH) {
                return getReposPage(page + 1).then(nextPageRepos => [...pageRepos, ...nextPageRepos]);
            }
            return pageRepos;
        });
    };

    return getReposPage(0).tap(repos => log(`${repos.length} repos found`));
};

export const fetchRepoPackage = repo => {
    log(`fetchRepoPackage ${repo}`);

    const github = new GitHubApi({
        version: '3.0.0'
    });
    github.authenticate({
        type: 'token',
        token: nconf.get('GITHUB_API_TOKEN')
    });

    const defer = Q.defer();
    github.repos.getContent({
        user: nconf.get('GITHUB_ORG'),
        repo,
        path: 'package.json'
    }, defer.makeNodeResolver());
    return defer.promise.then(({ content, encoding }) => {
        return JSON.parse(new Buffer(content, encoding).toString());
    });
};

export const fetchRepoPackagePullRequest = repo => {
    log(`fetchRepoPackagePullRequest ${repo}`);

    const github = new GitHubApi({
        version: '3.0.0'
    });
    github.authenticate({
        type: 'token',
        token: nconf.get('GITHUB_API_TOKEN')
    });

    const defer = Q.defer();
    github.pullRequests.getAll({
        user: nconf.get('GITHUB_ORG'),
        repo,
        state: 'open',
        head: `${nconf.get('GITHUB_ORG')}:goldkeeper-${nconf.get('PACKAGE')}`
    }, defer.makeNodeResolver());
    return defer.promise;
};

export const updatePullRequestComment = (pr, body) => {
    log(`updatePullRequestComment ${pr.title} ${body}`);

    const github = new GitHubApi({
        version: '3.0.0'
    });
    github.authenticate({
        type: 'token',
        token: nconf.get('GITHUB_API_TOKEN')
    });

    const defer = Q.defer();
    const params = {
        user: nconf.get('GITHUB_ORG'),
        repo: pr.head.repo.name,
        number: pr.number,
        title: pr.title,
        body: body
    };
    github.pullRequests.update(params, defer.makeNodeResolver());
    return defer.promise;
};
