import axios from 'axios';
import React, { Component } from 'react';
import Badge from 'react-bootstrap-v5/lib/Badge';
import Form from 'react-bootstrap-v5/lib/Form';
import Row from 'react-bootstrap-v5/lib/Row';
import Col from 'react-bootstrap-v5/lib/Col';
import Spinner from 'react-bootstrap-v5/lib/Spinner';
import { Link } from "react-router-dom";
import MyTable from './Table';
import { compare, GoBackButton, objectLink, parseQuery, rfc3339TimestampForDisplay, sizeWithFailures, sourceQueryStringParams } from './uiutil';

function pillVariant(tag) {
    if (tag.startsWith("latest-")) {
        return "success";
    }
    if (tag.startsWith("daily-")) {
        return "info";
    }
    if (tag.startsWith("weekly-")) {
        return "danger";
    }
    if (tag.startsWith("monthly-")) {
        return "dark";
    }
    if (tag.startsWith("annual-")) {
        return "warning";
    }
    return "primary";
}

export class SnapshotsTable extends Component {
    constructor() {
        super();
        this.state = {
            snapshots: [],
            showHidden: false,
            isLoading: false,
            error: null,
        };
        this.onChange = this.onChange.bind(this);
    }
    componentDidMount() {
        let q = parseQuery(this.props.location.search);

        this.setState({
            isLoading: true,
            host: q.host,
            userName: q.userName,
            path: q.path,
            hiddenCount: 0,
            selectedSnapshot: null,
        });
        const u = '/api/v1/snapshots?' + sourceQueryStringParams(q);
        axios.get(u).then(result => {
            console.log('got snapshots', result.data);
            this.setState({
                snapshots: result.data.snapshots,
                isLoading: false,
            });
        }).catch(error => this.setState({
            error,
            isLoading: false
        }));
    }

    coalesceSnapshots(s) {
        let filteredSnapshots = [];

        let lastRootID = "";
        let hiddenCount = 0;

        for (let i = 0; i < s.length; i++) {
            if (s[i].rootID !== lastRootID) {
                filteredSnapshots.push(s[i]);
            } else {
                hiddenCount++;
            }
            lastRootID = s[i].rootID;
        }

        if (this.state.showHidden) {
            return { filteredSnapshots: s, hiddenCount: hiddenCount };
        }

        return { filteredSnapshots, hiddenCount };
    }

    selectSnapshot(x) {
        this.setState({
            selectedSnapshot: x,
        })
    }

    onChange(x) {
        this.setState({
            showHidden: x.target.checked,
        });
    }

    render() {
        let { snapshots, isLoading, error } = this.state;
        if (error) {
            return <p>{error.message}</p>;
        }

        if (isLoading) {
            return <Spinner animation="border" variant="primary" />;
        }

        snapshots.sort((a, b) => -compare(a.startTime, b.startTime));

        let { filteredSnapshots, hiddenCount } = this.coalesceSnapshots(snapshots);

        const columns = [{
            id: 'startTime',
            Header: 'Start time',
            width: 200,
            accessor: x => <Link to={objectLink(x.rootID)}>{rfc3339TimestampForDisplay(x.startTime)}</Link>,
        }, {
            id: 'rootID',
            Header: 'Root',
            width: "",
            accessor: x => x.rootID,
        }, {
            Header: 'Retention',
            accessor: 'retention',
            width: "",
            Cell: x => <span>{x.cell.value.map(l =>
                <><Badge bg={pillVariant(l)}>{l}</Badge>{' '}</>
            )}</span>
        }, {
            Header: 'Size',
            accessor: 'summary.size',
            width: 100,
            Cell: x => sizeWithFailures(x.cell.value, x.row.original.summary),
        }, {
            Header: 'Files',
            accessor: 'summary.files',
            width: 100,
        }, {
            Header: 'Dirs',
            accessor: 'summary.dirs',
            width: 100,
        }]

        return <div className="padded">
            <Row>
                <Col>
            <GoBackButton onClick={this.props.history.goBack} />
            &nbsp;
            Displaying {filteredSnapshots.length !== snapshots.length ? filteredSnapshots.length + ' out of ' + snapshots.length : snapshots.length} snapshots of&nbsp;<b>{this.state.userName}@{this.state.host}:{this.state.path}</b>
                {hiddenCount > 0 &&
                    <>&nbsp;<Form.Group controlId="formBasicCheckbox">
                        <Form.Check
                            type="checkbox"
                            checked={this.state.showHidden}
                            label={'Show ' + hiddenCount + ' identical snapshots'}
                            onChange={this.onChange} />
                    </Form.Group></>}
                    </Col>
            </Row>
            <hr />
            <Row>
                <MyTable data={filteredSnapshots} columns={columns} />
            </Row>
        </div>;
    }
}
