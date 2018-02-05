'use strict';

System.register(['lodash'], function (_export, _context) {
  "use strict";

  var _, _createClass, GenericDatasource;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  return {
    setters: [function (_lodash) {
      _ = _lodash.default;
    }],
    execute: function () {
      _createClass = function () {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
          }
        }

        return function (Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);
          if (staticProps) defineProperties(Constructor, staticProps);
          return Constructor;
        };
      }();

      _export('GenericDatasource', GenericDatasource = function () {
        function GenericDatasource(instanceSettings, $q, backendSrv, templateSrv) {
          _classCallCheck(this, GenericDatasource);

          this.type = instanceSettings.type;
          this.url = instanceSettings.url;
          this.name = instanceSettings.name;
          this.q = $q;
          this.backendSrv = backendSrv;
          this.templateSrv = templateSrv;
          this.withCredentials = instanceSettings.withCredentials;
          this.headers = { 'Content-Type': 'application/json' };
          if (typeof instanceSettings.basicAuth === 'string' && instanceSettings.basicAuth.length > 0)
          {
            this.headers['Authorization'] = instanceSettings.basicAuth;
          }
        }

        _createClass(GenericDatasource, [
        {
          key: 'testDatasource',
            value: function testDatasource() {
                return this.doRequest({
                    url: this.url + '/pc/odata/api/getSchemaVersion',
                    method: 'GET'
                }).then(function (response) {
                    if (response.status === 200) {
                        return { status: "success", message: "Data source is working", title: "Success" };
                    }
                });
            }
        },
        {
          key: 'query',
            value: function query(options)
            {
                var _this = this;

                var query = this.buildQueryParameters(options);
                query.targets = query.targets.filter(function (t) {
                                                              return !t.hide;
                                                            });
                if (query.targets.length <= 0)
                {
                    return this.q.when({ data: [] });
                }
                // TODO: Support more than one query
                return this.doRequest({
                          method: 'GET',
                          url: this.url + '/pc/odata/api/' + query.targets[0].target,
                          queryData: query.targets[0]
                }).then(function (result) {
                    if (result.status === 200)
                    {
                        if (result.config.queryData.type == "table")
                        {
                            result.data = _this.mapResultToTable(result.config.queryData, result.data.d.results);
                        }
                        else
                        {
                            result.data = _this.mapResultToTimeSeries(result.config.queryData, result.data.d.results);
                        }
                        // Return result
                        return (result);
                    }
                });
            }
        },
        {
          key: 'mapResultToTable',
            value: function mapResultToTable(queryData, openAPIData)
            {
                // Enumerate response to get columns
                var tableColumns = [];
                if(openAPIData.length >= 1)
                {
                    for (var recordKey in openAPIData[0])
                    {
                        if(recordKey == "Timestamp")
                        {
                            tableColumns.push({text: recordKey, type: "time"})
                        }
                        else
                        {
                            tableColumns.push({text: recordKey})
                        }
                    }
                }
                // Get the rows
                var tableRows = [];
                for(var count = 0; count < openAPIData.length; count++)
                {
                    var rowData = [];
                    var record = openAPIData[count];
                    for (var dataKey in record)
                    {
                        rowData.push(record[dataKey]);
                    }
                    tableRows.push(rowData);
                }
                // Build the result
                var data = [{columns: tableColumns, rows: tableRows, type: "table"}];
                return(data);
            }
        },
        {
          key: 'mapResultToTimeSeries',
            value: function mapResultToTimeSeries(queryData, openAPIData)
            {
                var returnData = [];
                if(queryData.queryType == "topn")
                {
                    returnData = this.mapResultToTimeSeriesForTopN(queryData, openAPIData);
                }
                else
                {
                    returnData = this.mapResultToTimeSeriesForDataQuery(queryData, openAPIData);
                }
                return(returnData);
            }
        },
        {
          key: 'mapResultToTimeSeriesForDataQuery',
            value: function mapResultToTimeSeriesForDataQuery(queryData, openAPIData)
            {
                var returnData = [];
                for(var count = 0; count < openAPIData.length; count++)
                {
                    // Get the record
                    var record = openAPIData[count];
                    // Name
                    var name = record['Name'];
                    if(queryData.showparent)
                    {
                        name = name + "(" + record['device'].Name + ")";
                    }
                    else
                    {
                        name = name + "(" + record['ID'] + ")";
                    }
                    // Metric data
                    var metricData = this.extractRecords(queryData, record[queryData.metricfamily].results);
                    // Add data
                    returnData.push({
                        target: name,
                        datapoints: metricData
                    });
                }
                return(returnData);
            }
        },
        {
          key: 'mapResultToTimeSeriesForTopN',
            value: function mapResultToTimeSeriesForTopN(queryData, openAPIData)
            {
                // Enumerate response to get columns
                var tableColumns = [];
                if(openAPIData.length >= 1)
                {
                    // Put DeviceName/Component Name first
                    tableColumns.push({text: ((queryData.groupBy == "Device") ? "Device" : "Component")});
                    // Add the metric too
                    tableColumns.push({text: queryData.metric + " (avg)", sort: true, desc: true});
                }
                // Get the rows
                var tableRows = [];
                for(var count = 0; count < openAPIData.length; count++)
                {
                    var record = openAPIData[count];
                    var rowData = [];
                    // Put DeviceName/Component Name first
                    rowData.push(((queryData.groupBy == "Device") ? record["device"].Name : (record["component"].Name + " (" + record["device"].Name + ")")));
                    // Add the metric too
                    rowData.push(record["Value"] * 1.0);
                    // Add to main record set
                    tableRows.push(rowData);
                }
                // Build the result
                var data = [{columns: tableColumns, rows: tableRows, type: "table"}];
                return(data);
            }
        },
        {
            key: 'extractRecords',
            value: function extractRecords(queryData, records)
            {
                var metricData = [];
                for(var count = 0; count < records.length; count++)
                {
                    // Get the record
                    var record = records[count];
                    // Timestamp
                    var timestamp = Math.floor(record['Timestamp'] * 1000);
                    // Metric
                    var metric = record[queryData.metric];
                    // Add it
                    metricData.push([metric, timestamp]);
                }
                return(metricData);
            }
        },
        {
          key: 'doRequest',
            value: function doRequest(options)
            {
                options.withCredentials = this.withCredentials;
                options.headers = this.headers;

                return this.backendSrv.datasourceRequest(options);
            }
        },
        {
            key: 'getDate',
            value: function getDate(date, roundUp)
            {
                if (_.isString(date))
                {
                    date = dateMath.parse(date, roundUp);
                }
                return Math.ceil(date.valueOf() / 1000);
            }
        },
        {
          key: 'buildQueryParameters',
            value: function buildQueryParameters(options)
            {
                var _this = this;

                // Remove targets without any selections
                options.targets = _.filter(options.targets, function (target) {
                    if(target.queryType == 'data')
                    {
                        if (target.entity == undefined || target.metricfamily == undefined || target.metric == undefined)
                        {
                            return (false);
                        }
                    }
                    else
                    {
                        if (target.metricfamily == undefined || target.metric == undefined)
                        {
                            return (false);
                        }
                    }
                    // else
                    return (true);
                });

                // Build our queries
                options.targets.forEach(function(element)
                {
                    if(element.queryType == 'data')
                    {
                        element.target = _this.buildDataQuery(options, element);
                    }
                    else
                    {
                        element.target = _this.buildTopNQuery(options, element);
                    }
                    element.hide = false;
                });

                // Get dates
                var start = _this.getDate(options.range.from, false);
                var end = _this.getDate(options.range.to, true);
                var openApiScopedVars = Object.assign({}, options.scopedVars, {
                    '__unixEpochFrom': {text: start,  value: start},
                    '__unixEpochTo':  {text: end, value: end}
                });
                // Build final queries
                var targets = _.map(options.targets, function (target) {
                    return {
                        // Query
                        target: _this.templateSrv.replaceWithText(target.target, openApiScopedVars, 'regex'),
                        // Parameters
                        // Generic
                        metricfamily: target.metricfamily,
                        metric: target.metric,
                        top: target.top,
                        filter: target.filter,
                        // Type
                        queryType: target.queryType,
                        // Data
                        entity: target.entity,
                        showparent: target.showparent || false,
                        // Top N
                        groupBy: target.groupBy,
                        // Grafana stuff
                        refId: target.refId,
                        hide: target.hide,
                        type: target.type || 'timeseries'
                  };
                });

                options.targets = targets;

                return options;
          }
        },
        {
          key: 'buildDataQuery',
            value: function buildDataQuery(options, element)
            {
                // Build the parts of our query
                // Expand
                var expand = element.metricfamily;
                if(element.showparent)
                {
                    expand = (expand + "," + "device");
                }
                // Select
                var select = "ID,Name";
                if(element.showparent == true)
                {
                    select = (select + "," + "device/Name");
                }
                select = (select +  "," + (element.metricfamily + "/Timestamp") + "," + (element.metricfamily + "/" + element.metric));
                // Filter
                var filter = "";
                if(element.filter != undefined && element.filter != '')
                {
                    filter = "&$filter=" + element.filter;
                }
                else
                {
                    element.filter = '';
                }
                // Default top
                if(element.top == undefined)
                {
                    element.top = 10;
                }
                // build query
                var target = element.entity + "?" +
                        "$expand=" + expand +
                        "&$select=" + select +
                        "&resolution=" + this.getRate(element) +
                        "&starttime=$__unixEpochFrom&endtime=$__unixEpochTo" +
                        filter +
                        "&$top=" + element.top + "&top=" + options.maxDataPoints +
                        "&$orderby=Name asc";
                return(target);
            }
        },
        {
          key: 'buildTopNQuery',
            value: function buildTopNQuery(options, element)
            {
                // cpumfs?$apply=groupby(DeviceItemID, aggregate(im_Utilization with average as Value))$expand=device&$select=device/Name&$orderby=Value desc&&tz=-05:00&$skip=0&$top=10
                var apply = "groupby(" + (element.groupBy == "Device" ? "DeviceItemID" : "ID") + ", aggregate(" + element.metric + " with average as Value))";
                // Expand
                var expand = (element.groupBy == "Device" ? "device" : "device, component");
                // Select
                var select = (element.groupBy == "Device" ? "device/Name, Value" : "device/Name, component/Name, Value");
                // Filter
                var filter = "";
                if(element.filter != undefined && element.filter != '')
                {
                    filter = "&$filter=" + element.filter;
                }
                else
                {
                    element.filter = '';
                }
                // build query
                var target = element.metricfamily + "?" +
                    "$expand=" + expand +
                    "&$apply=" + apply +
                    "&$select=" + select +
                    "&resolution=" + this.getRate(element) +
                    "&starttime=$__unixEpochFrom&endtime=$__unixEpochTo" +
                    filter +
                    "&$top=" + element.top +
                    "&$orderby=Value desc";
                return(target);
            }
        },
        {
          key: 'getRate',
            value: function getRate(element)
            {
                if(element.rate == "Hour")
                {
                    return("HOUR");
                }
                else if(element.rate == "Day")
                {
                    return("DAY");
                }
                // Else
                return("RATE");
            }
        }


        ]);

        return GenericDatasource;
      }());

      _export('GenericDatasource', GenericDatasource);
    }
  };
});
//# sourceMappingURL=datasource.js.map
