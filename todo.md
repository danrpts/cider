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
- [ ] Passport integration
- [ ] Metadata schema shared by discussion and comments
- [x] Discussion may use a "threaded comment" style schema
- [ ] Votes may be stored in bucket style schema (eg. 100 votes per document)
- [x] Stars stored in ref array on User and count is denormalized on discussion

v1.0.0
- [ ] React frontend

Misc
- optimize schemas and handlers
- lock revote after some time
- use ES6 promises with Mongoose
- upgrade to Koa
- validate and sanitize schema inputs
- modularize code and create folder hierarchy
- use hooks for deletes
- search via tags and metadata nodes
- create folder hierarchy
