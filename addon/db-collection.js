import _assign from 'lodash/object/assign';
import _isArray from 'lodash/lang/isArray';
import _isEqual from 'lodash/lang/isEqual';

function duplicate(data) {
  if (_isArray(data)) {
    return data.map(function(el) {
      return _assign({}, el);
    });
  } else {
    return _assign({}, data);
  }
}

/*
  A collection of db records i.e. a database table.
*/
class DbCollection {

  constructor(name, initialData) {
    this.name = name;
    this._records = [];

    if (initialData) {
      this.insert(initialData);
    }
  }

  /*
    Returns a copy of the data, to prevent inadvertant data manipulation.
  */
  all() {
    return duplicate(this._records);
  }

  insert(data) {
    let copy = data ? duplicate(data) : {};
    let records = this._records;
    let returnData;

    if (!_isArray(copy)) {
      let attrs = copy;
      if (attrs.id === undefined || attrs.id === null) {
        attrs.id = records.length + 1;
      }

      records.push(attrs);
      returnData = duplicate(attrs);

    } else {
      returnData = [];
      copy.forEach(data => {
        if (data.id === undefined || data.id === null) {
          data.id = records.length + 1;
        }

        records.push(data);
        returnData.push(data);
        returnData = returnData.map(duplicate);
      });
    }

    return returnData;
  }

  find(ids) {
    if (_isArray(ids)) {
      let records = this._findRecords(ids)
        .filter(r => r !== undefined);

      // Return a copy
      return records.map(duplicate);

    } else {
      let record = this._findRecord(ids);
      if (!record) { return null; }

      // Return a copy
      return duplicate(record);
    }
  }

  where(query) {
    let records = this._findRecordsWhere(query);

    return records.map(duplicate);
  }

  firstOrCreate(query, attributesForNew={}) {
    let queryResult = this.where(query);
    let record = queryResult[0];

    if (record) {
      return record;
    } else {
      let mergedAttributes = _assign(attributesForNew, query);
      let createdRecord = this.insert(mergedAttributes);

      return createdRecord;
    }
  }

  update(target, attrs) {
    let records;

    if (typeof attrs === 'undefined') {
      attrs = target;
      let changedRecords = [];
      this._records.forEach(function(record) {
        let oldRecord = duplicate(record);

        for (let attr in attrs) {
          record[attr] = attrs[attr];
        }

        if (!_isEqual(oldRecord, record)) {
          changedRecords.push(record);
        }
      });

      return changedRecords;

    } else if (typeof target === 'number' || typeof target === 'string') {
      let id = target;
      let record = this._findRecord(id);

      for (let attr in attrs) {
        record[attr] = attrs[attr];
      }

      return record;

    } else if (_isArray(target)) {
      let ids = target;
      records = this._findRecords(ids);

      records.forEach(record => {
        for (let attr in attrs) {
          record[attr] = attrs[attr];
        }
      });

      return records;

    } else if (typeof target === 'object') {
      let query = target;
      records = this._findRecordsWhere(query);

      records.forEach(record => {
        for (let attr in attrs) {
          record[attr] = attrs[attr];
        }
      });

      return records;
    }
  }

  remove(target) {
    let records;

    if (typeof target === 'undefined') {
      this._records = [];

    } else if (typeof target === 'number' || typeof target === 'string') {
      let record = this._findRecord(target);
      let index = this._records.indexOf(record);
      this._records.splice(index, 1);

    } else if (_isArray(target)) {
      records = this._findRecords(target);
      records.forEach(record =>  {
        let index = this._records.indexOf(record);
        this._records.splice(index, 1);
      });

    } else if (typeof target === 'object') {
      records = this._findRecordsWhere(target);
      records.forEach(record =>  {
        let index = this._records.indexOf(record);
        this._records.splice(index, 1);
      });
    }
  }


  /*
    Private methods.

    These return the actual db objects, whereas the public
    API query methods return copies.
  */

  _findRecord(id) {
    let allDigitsRegex = /^\d+$/;

    // If parses, coerce to integer
    if (typeof id === 'string' && allDigitsRegex.test(id)) {
      id = parseInt(id, 10);
    }

    let record = this._records.filter(obj => obj.id === id)[0];

    return record;
  }

  _findRecords(ids) {
    let records = ids.map(id => this._findRecord(id));

    return records;
  }

  _findRecordsWhere(query) {
    let records = this._records;

    function defaultQueryFunction (record) {
      let keys = Object.keys(query);

      return keys.every(function(key) {
        return String(record[key]) === String(query[key]);
      });
    }

    let queryFunction = typeof query === 'object' ? defaultQueryFunction : query;

    return records.filter(queryFunction);
  }
}

export default DbCollection;