/*
 *  Charon: A game authentication server
 *  Copyright (C) 2014  Alex Mayfield
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU Affero General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU Affero General Public License for more details.
 *
 *  You should have received a copy of the GNU Affero General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var _ = require('lodash');

// Generate query parameters for sequelize query from request.
module.exports.qinfo = function(req) {
	var page = 1;
	if ("p" in req.query && isFinite(req.query.p)) {
		page = parseInt(req.query.p);
	}	

	var limit = 10;
	if ("l" in req.query && isFinite(req.query.l)) {
		limit = parseInt(req.query.l);
	}	

	return {
		page: page,
		limit: limit,
		offset: (page - 1) * limit
	};
}

// Generate pinfo for paginator macro.
module.exports.pinfo = function(page, total, limit, query) {
	var totalPages = Math.ceil(total/limit);
	var minPage = Math.max(1, page - 3);
	var maxPage = Math.min(totalPages, page + 3);
	var baseQuery = {
		p: page,
		l: limit
	};
	if (_.isObject(query)) {
		baseQuery = _.assign(baseQuery, query);
	}

	return {
		total: total,
		page: page,
		limit: limit,
		totalPages: totalPages,
		minPage: minPage,
		maxPage: maxPage,
		baseQuery: baseQuery
	};
}
