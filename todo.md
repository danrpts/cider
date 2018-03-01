Misc
- optimize schemas and handlers
- allow revote
- only allow user to respond to question once
- use aggregate/mapReduce for bumps, stars, options/votes ?
- use ES6 promises with Mongoose
- upgrade to Koa
- validate and sanitize schema inputs
- modularize code and create folder hierarchy
- use hooks for deletes (delete question and answers); anywhere else?
- search

v0.0.0
- [x] Added support for users sessions
- [x] Added support for polling
- [x] Poll options are embedded
- [x] Votes are embedded

v0.1.0
- [x] Added support for question/answer
- [x] Poll, questions, and answers have their own schemas
- [x] Stars, bumps, and votes are embedded

v0.2.0
- [x] Added support for threaded discussion
- [x] Discussions, Questions, Answers, and Polls share a schema

v0.3.0
- [ ] Metadata schema shared by all post styles
- [ ] Discussion may use a "threaded comment" style schema
- [ ] Question/Answer may use a "chronological comment" style schema
- [ ] Poll may use an "embedded comment" schema
- [ ] Votes may be stored in bucket style schema (eg. 100 votes per document)
- [ ] Stars and bumps may be stored in bucket style schema
- [ ] Bucket style schemas must have efficient mapping to metadata and user owned content

v1.0.0
- react frontend
